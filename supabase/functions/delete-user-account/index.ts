import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 1 request per day per user
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

async function checkRateLimit(supabase: any, userId: string, functionName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('edge_function_rate_limits')
    .select('last_request_at')
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error checking rate limit:', error);
    return true; // Allow on error to avoid blocking legitimate requests
  }

  if (data) {
    const timeSinceLastRequest = Date.now() - new Date(data.last_request_at).getTime();
    if (timeSinceLastRequest < RATE_LIMIT_WINDOW_MS) {
      return false; // Rate limit exceeded
    }
  }

  // Update or insert rate limit record
  await supabase
    .from('edge_function_rate_limits')
    .upsert({
      user_id: userId,
      function_name: functionName,
      last_request_at: new Date().toISOString(),
    });

  return true; // Allowed
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
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

    // Get user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("User verification error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    const allowed = await checkRateLimit(supabaseAdmin, user.id, 'delete-user-account');
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. You can only delete your account once per day." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete user data in correct order (respecting foreign key constraints)
    
    // 1. Delete achievements
    const { error: achievementsError } = await supabaseAdmin
      .from("achievements")
      .delete()
      .eq("user_id", user.id);
    
    if (achievementsError) {
      console.error("Error deleting achievements:", achievementsError);
    }

    // 2. Delete progress data
    const { error: progressError } = await supabaseAdmin
      .from("progress")
      .delete()
      .eq("user_id", user.id);
    
    if (progressError) {
      console.error("Error deleting progress:", progressError);
    }

    // 3. Delete admin notifications for user's orders
    const { data: userOrders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", user.id);

    if (userOrders && userOrders.length > 0) {
      const orderIds = userOrders.map(order => order.id);
      const { error: notificationsError } = await supabaseAdmin
        .from("admin_notifications")
        .delete()
        .in("order_id", orderIds);
      
      if (notificationsError) {
        console.error("Error deleting notifications:", notificationsError);
      }
    }

    // 4. Delete orders
    const { error: ordersError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("user_id", user.id);
    
    if (ordersError) {
      console.error("Error deleting orders:", ordersError);
    }

    // 5. Delete user roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);
    
    if (rolesError) {
      console.error("Error deleting user roles:", rolesError);
    }

    // 6. Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("user_id", user.id);
    
    if (profileError) {
      console.error("Error deleting user profile:", profileError);
    }

    // 7. Finally, delete the user from auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    );

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete user account", details: authDeleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in delete-user-account function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
