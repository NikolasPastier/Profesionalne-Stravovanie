import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createHash } from "https://deno.land/std@0.190.0/node/crypto.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 3; // 3 emails per hour per IP

interface ContactEmailRequest {
  name: string;
  email: string;
  message: string;
}

// Sanitize text to prevent injection attacks
const sanitizeText = (text: string, maxLength: number): string => {
  return text
    .slice(0, maxLength)
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return entities[char];
    })
    .replace(/[\r\n]+/g, ' '); // Remove newlines to prevent header injection
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

// Check rate limit
async function checkRateLimit(supabase: any, ipAddress: string): Promise<boolean> {
  const identifier = createHash('sha256').update(ipAddress).digest('hex');
  
  const { data, error } = await supabase
    .from('edge_function_rate_limits')
    .select('*')
    .eq('user_id', identifier)
    .eq('function_name', 'send-contact-email')
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  const now = new Date();
  if (data) {
    const lastRequest = new Date(data.last_request_at);
    const timeSinceLastRequest = now.getTime() - lastRequest.getTime();

    if (timeSinceLastRequest < RATE_LIMIT_WINDOW_MS) {
      if (data.request_count >= MAX_REQUESTS) {
        return false; // Rate limited
      }
      await supabase
        .from('edge_function_rate_limits')
        .update({
          request_count: data.request_count + 1,
          last_request_at: now.toISOString(),
        })
        .eq('user_id', identifier)
        .eq('function_name', 'send-contact-email');
    } else {
      // Reset counter
      await supabase
        .from('edge_function_rate_limits')
        .update({
          request_count: 1,
          last_request_at: now.toISOString(),
        })
        .eq('user_id', identifier)
        .eq('function_name', 'send-contact-email');
    }
  } else {
    // Create new rate limit entry
    await supabase
      .from('edge_function_rate_limits')
      .insert({
        user_id: identifier,
        function_name: 'send-contact-email',
        request_count: 1,
        last_request_at: now.toISOString(),
      });
  }
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check rate limit
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const allowed = await checkRateLimit(supabase, ipAddress);
    
    if (!allowed) {
      console.log("Rate limit exceeded for IP:", ipAddress);
      return new Response(
        JSON.stringify({ error: 'Príliš veľa požiadaviek. Skúste to prosím neskôr (max 3 správy za hodinu).' }),
        { 
          status: 429, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Parse and validate input
    const { name: rawName, email: rawEmail, message: rawMessage }: ContactEmailRequest = await req.json();

    // Validate required fields
    if (!rawName || !rawEmail || !rawMessage) {
      return new Response(
        JSON.stringify({ error: 'Všetky polia sú povinné.' }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Validate email format
    if (!isValidEmail(rawEmail)) {
      return new Response(
        JSON.stringify({ error: 'Neplatná e-mailová adresa.' }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Sanitize inputs
    const name = sanitizeText(rawName.trim(), 100);
    const email = sanitizeText(rawEmail.trim(), 255);
    const message = sanitizeText(rawMessage.trim(), 2000);

    // Additional validation after sanitization
    if (name.length === 0 || email.length === 0 || message.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Polia nemôžu byť prázdne.' }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log("Sending contact email from:", name, email);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "VIP Stravovanie <onboarding@resend.dev>",
        to: ["andrejkukura4@gmail.com"],
        subject: `Nová správa od ${name}`,
        html: `
          <h2>Nová kontaktná správa</h2>
          <p><strong>Meno:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Správa:</strong></p>
          <p>${message}</p>
        `,
      }),
    });

    const data = await emailResponse.json();

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
