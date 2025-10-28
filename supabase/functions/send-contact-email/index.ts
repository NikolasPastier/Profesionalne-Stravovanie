import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = Deno.env.get("CONTACT_EMAIL") || "VIP Stravovanie <onboarding@resend.dev>";

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

// Sanitize text
const sanitizeText = (text: string, maxLength: number): string => {
  return text
    .slice(0, maxLength)
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "&": "&amp;",
      };
      return entities[char];
    })
    .replace(/[\r\n]+/g, " ");
};

// Validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

// Hash IP
async function hashIdentifier(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Rate limiting
async function checkRateLimit(supabase: any, ipAddress: string): Promise<boolean> {
  const identifier = await hashIdentifier(ipAddress);

  const { data, error } = await supabase
    .from("edge_function_rate_limits")
    .select("*")
    .eq("user_id", identifier)
    .eq("function_name", "send-contact-email")
    .single();

  if (error && error.code !== "PGRST116") throw error;

  const now = new Date();

  if (data) {
    const lastRequest = new Date(data.last_request_at);
    const timeSince = now.getTime() - lastRequest.getTime();

    if (timeSince < RATE_LIMIT_WINDOW_MS) {
      if (data.request_count >= MAX_REQUESTS) return false;

      await supabase
        .from("edge_function_rate_limits")
        .update({
          request_count: data.request_count + 1,
          last_request_at: now.toISOString(),
        })
        .eq("user_id", identifier)
        .eq("function_name", "send-contact-email");
    } else {
      await supabase
        .from("edge_function_rate_limits")
        .update({
          request_count: 1,
          last_request_at: now.toISOString(),
        })
        .eq("user_id", identifier)
        .eq("function_name", "send-contact-email");
    }
  } else {
    await supabase.from("edge_function_rate_limits").insert({
      user_id: identifier,
      function_name: "send-contact-email",
      request_count: 1,
      last_request_at: now.toISOString(),
    });
  }
  return true;
}

// Send email via Resend
async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      ...(replyTo && { reply_to: replyTo }),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Resend API error:", data);
    throw new Error(data.error?.message || "Failed to send email");
  }
  return data;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const allowed = await checkRateLimit(supabase, ipAddress);

    if (!allowed) {
      return new Response(JSON.stringify({ error: "Príliš veľa požiadaviek. Max 3 správy za hodinu." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { name: rawName, email: rawEmail, message: rawMessage }: ContactEmailRequest = await req.json();

    if (!rawName || !rawEmail || !rawMessage) {
      return new Response(JSON.stringify({ error: "Všetky polia sú povinné." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isValidEmail(rawEmail)) {
      return new Response(JSON.stringify({ error: "Neplatná e-mailová adresa." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const name = sanitizeText(rawName.trim(), 100);
    const email = sanitizeText(rawEmail.trim(), 255);
    const message = sanitizeText(rawMessage.trim(), 2000);

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Polia nemôžu byť prázdne po overení." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending contact email from:", name, email);

    // 1. Email to admin
    await sendEmail(
      "admin@profesionalnestravovanie.sk",
      `Nová správa od ${name}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fafafa;">
          <h2 style="color: #d97706; margin-bottom: 16px;">Nová kontaktná správa</h2>
          <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 8px 0;"><strong>Meno:</strong> ${name}</p>
            <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          </div>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
            <strong>Správa:</strong><br><br>
            ${message.replace(/\n/g, "<br>")}
          </div>
          <hr style="margin: 24px 0; border: 0; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; text-align: center;">
            Odoslané z <strong>profesionalnestravovanie.sk</strong>
          </p>
        </div>
      `,
      email,
    );

    // 2. Auto-reply to customer
    await sendEmail(
      email,
      "Ďakujeme za správu! Ozveme sa čoskoro",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fafafa;">
          <h2 style="color: #16a34a; margin-bottom: 16px;">Ďakujeme, ${name}!</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Tvoja správa bola úspešne prijatá. Ozveme sa ti <strong>do 24 hodín</strong>.
          </p>
          <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 8px 0; font-size: 14px;"><strong>Tvoja správa:</strong></p>
            <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px;">
              ${message.replace(/\n/g, "<br>")}
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            S pozdravom,<br>
            <strong>VIP Stravovanie</strong><br>
            <a href="https://profesionalnestravovanie.sk" style="color: #2563eb;">profesionalnestravovanie.sk</a>
          </p>
        </div>
      `,
    );

    return new Response(JSON.stringify({ success: true, message: "Správa odoslaná!" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email:", error);
    return new Response(JSON.stringify({ error: error.message || "Interná chyba servera" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
