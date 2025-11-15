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
  selectedDays?: string[];
  menu?: { 
    items?: any[];
    start_date?: string;
  };
  menuId?: string;
  day?: string;
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

    // Helper function to normalize region names
    const normalizeRegion = (region?: string): string => {
      if (!region) return 'other';
      
      // Normalize: trim, lowercase, remove diacritics
      const normalized = region
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      // Map aliases to canonical values
      const regionMap: Record<string, string> = {
        'nitriansky': 'nitra',
        'nitra': 'nitra',
        'bratislavsky': 'bratislava',
        'bratislava': 'bratislava',
        'sered': 'sered',
        'trnava': 'trnava',
        'other': 'other'
      };
      
      // Return canonical value or 'other' if not recognized
      return regionMap[normalized] || 'other';
    };

    const canonicalRegion = normalizeRegion(deliveryRegion);
    console.log('Region normalization:', deliveryRegion, '->', canonicalRegion);

    // Helper function to check if a day can still be ordered based on 12:00 cutoff
    const isDayOrderable = (dayName: string, menuStartDate: string): boolean => {
      const dayMap: Record<string, number> = {
        'Pondelok': 1,
        'Utorok': 2,
        'Streda': 3,
        'Štvrtok': 4,
        'Piatok': 5,
      };

      const now = new Date();
      const currentHour = now.getHours();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const menuStart = new Date(menuStartDate);
      menuStart.setHours(0, 0, 0, 0);

      const dayIndex = dayMap[dayName];
      if (!dayIndex) return false; // Unknown day

      // Calculate the actual date for this day
      const dayDate = new Date(menuStart);
      dayDate.setDate(menuStart.getDate() + (dayIndex - 1));

      // If the day is in the past, it's not available
      if (dayDate < today) return false;

      // If it's after 12:00 noon, the next day cannot be ordered anymore
      if (currentHour >= 12) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        // If this day is tomorrow, it's no longer available after 12:00
        if (dayDate.getTime() === tomorrow.getTime()) {
          return false;
        }
      }

      // If this day is today, it's not available
      if (dayDate.getTime() === today.getTime()) {
        return false;
      }

      return true;
    };

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

        // Validate 12:00 cutoff for weekly orders
        if (item.selectedDays && item.menu?.start_date) {
          const unavailableDays = item.selectedDays.filter(
            day => !isDayOrderable(day, item.menu!.start_date!)
          );
          
          if (unavailableDays.length > 0) {
            errors.push(
              `Položka ${i + 1}: Tieto dni už nie sú dostupné na objednanie: ${unavailableDays.join(', ')}. ` +
              `Objednávky pre nasledujúci deň musia byť podané do 12:00.`
            );
          }
        }
      }

      // Validate size
      const validSizes = ['S', 'M', 'L', 'XL', 'XXL', 'XXL+', 'CUSTOM'];
      if (!validSizes.includes(item.size)) {
        errors.push(`Položka ${i + 1}: Neplatná veľkosť menu (${item.size})`);
      }

      // Validate type
      const validTypes = ['week', 'day'];
      if (!validTypes.includes(item.type)) {
        errors.push(`Položka ${i + 1}: Neplatný typ objednávky`);
      }
    }

    // 4. Delivery region is already normalized above, no need to validate
    // The normalizeRegion function handles all cases and defaults to 'other'

    if (errors.length > 0) {
      console.log('Validation failed:', errors);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          errors,
          message: 'Objednávka neprešla validáciou'
        }),
        {
          status: 200,
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
