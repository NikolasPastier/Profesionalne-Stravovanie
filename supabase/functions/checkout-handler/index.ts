import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 10 checkout attempts per hour per IP
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

interface CheckoutRequest {
  email: string;
  name: string;
  phone: string;
  address: string;
  kraj: string;
  note?: string;
  deliveryType: string;
}

async function checkRateLimit(supabase: any, identifier: string): Promise<boolean> {
  const functionName = 'checkout-handler';
  
  const { data, error } = await supabase
    .from('edge_function_rate_limits')
    .select('request_count, last_request_at')
    .eq('user_id', identifier)
    .eq('function_name', functionName)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking rate limit:', error);
    return true; // Allow on error
  }

  const now = Date.now();
  
  if (data) {
    const timeSinceLastRequest = now - new Date(data.last_request_at).getTime();
    
    if (timeSinceLastRequest < RATE_LIMIT_WINDOW_MS) {
      if (data.request_count >= MAX_REQUESTS) {
        return false; // Rate limit exceeded
      }
      
      // Update request count
      await supabase
        .from('edge_function_rate_limits')
        .update({
          request_count: data.request_count + 1,
          last_request_at: new Date().toISOString(),
        })
        .eq('user_id', identifier)
        .eq('function_name', functionName);
    } else {
      // Reset counter if window expired
      await supabase
        .from('edge_function_rate_limits')
        .update({
          request_count: 1,
          last_request_at: new Date().toISOString(),
        })
        .eq('user_id', identifier)
        .eq('function_name', functionName);
    }
  } else {
    // Create new rate limit record
    await supabase
      .from('edge_function_rate_limits')
      .insert({
        user_id: identifier,
        function_name: functionName,
        request_count: 1,
        last_request_at: new Date().toISOString(),
      });
  }

  return true; // Allowed
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email }: CheckoutRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use email as identifier for rate limiting (hashed for privacy)
    const encoder = new TextEncoder();
    const data = encoder.encode(email);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const identifier = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 36);

    // Check rate limit
    const allowed = await checkRateLimit(supabaseAdmin, identifier);
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          rateLimitExceeded: true 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user exists using efficient RPC function (without revealing if account exists)
    const { data: userExists, error: getUserError } = await supabaseAdmin.rpc(
      'check_email_exists',
      { email_input: email }
    );
    
    if (getUserError) {
      console.error("Error checking user:", getUserError);
      // Return generic response to prevent enumeration
      return new Response(
        JSON.stringify({ 
          requiresAuth: true,
          message: "Please proceed with authentication" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userExists) {
      // User exists - require login
      return new Response(
        JSON.stringify({ 
          requiresAuth: true,
          accountExists: true,
          message: "Please log in to continue" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // User doesn't exist - create account with secure password
      const array = new Uint8Array(20);
      crypto.getRandomValues(array);
      const tempPassword = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('') + 'Aa1!';
      
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { temp_password: true }
      });

      if (signUpError) {
        console.error("Error creating user:", signUpError);
        return new Response(
          JSON.stringify({ error: "Unable to process checkout" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          requiresAuth: true,
          accountCreated: true,
          userId: signUpData.user?.id,
          message: "Account created. Please set a password" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error in checkout-handler:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
