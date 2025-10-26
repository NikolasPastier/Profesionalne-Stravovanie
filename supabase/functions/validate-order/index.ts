import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation limits
const MAX_QUANTITY_PER_ITEM = 50;
const MAX_TOTAL_ORDER_VALUE = 10000; // €10,000
const MAX_CART_ITEMS = 20;

interface CartItem {
  size: string;
  type: string;
  isVegetarian?: boolean;
  selectedDays?: any[];
  menu?: { items?: any[] };
}

interface ValidationRequest {
  cartItems: CartItem[];
  totalPrice: number;
  deliveryRegion: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Neautorizovaný prístup', valid: false }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { cartItems, totalPrice, deliveryRegion }: ValidationRequest = await req.json();

    console.log('Validating order for user:', user.id, 'Items:', cartItems.length, 'Total:', totalPrice);

    // Validation checks
    const errors: string[] = [];

    // 1. Check number of cart items
    if (!cartItems || cartItems.length === 0) {
      errors.push('Košík je prázdny');
    } else if (cartItems.length > MAX_CART_ITEMS) {
      errors.push(`Maximálny počet položiek v košíku je ${MAX_CART_ITEMS}`);
    }

    // 2. Check total order value
    if (totalPrice > MAX_TOTAL_ORDER_VALUE) {
      errors.push(`Maximálna hodnota objednávky je €${MAX_TOTAL_ORDER_VALUE.toLocaleString()}`);
    }

    if (totalPrice <= 0) {
      errors.push('Celková cena objednávky musí byť väčšia ako 0');
    }

    // 3. Validate each cart item
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];

      // Check quantity for weekly menus
      if (item.type === 'week') {
        const numberOfDays = item.selectedDays?.length || item.menu?.items?.length || 5;
        
        if (numberOfDays > MAX_QUANTITY_PER_ITEM) {
          errors.push(`Položka ${i + 1}: Maximálny počet dní je ${MAX_QUANTITY_PER_ITEM}`);
        }

        if (numberOfDays <= 0) {
          errors.push(`Položka ${i + 1}: Musí mať aspoň jeden deň`);
        }
      }

      // Validate size
      const validSizes = ['S', 'M', 'L'];
      if (!validSizes.includes(item.size)) {
        errors.push(`Položka ${i + 1}: Neplatná veľkosť menu (${item.size})`);
      }

      // Validate type
      const validTypes = ['week', 'day'];
      if (!validTypes.includes(item.type)) {
        errors.push(`Položka ${i + 1}: Neplatný typ objednávky`);
      }
    }

    // 4. Validate delivery region
    const validRegions = ['nitra', 'bratislava', 'other'];
    if (!validRegions.includes(deliveryRegion.toLowerCase())) {
      errors.push('Neplatná oblasť doručenia');
    }

    if (errors.length > 0) {
      console.log('Validation failed:', errors);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          errors,
          message: 'Objednávka neprešla validáciou'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Order validation passed for user:', user.id);

    return new Response(
      JSON.stringify({ 
        valid: true, 
        message: 'Objednávka je validná'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error during validation:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Neočakávaná chyba pri validácii objednávky' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
