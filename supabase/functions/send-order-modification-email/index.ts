import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderModificationRequest {
  userName: string;
  userEmail: string;
  orderId: string;
  removedDay: string;
  remainingDays: string[];
  orderDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail, orderId, removedDay, remainingDays, orderDate }: OrderModificationRequest = await req.json();
    
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

    if (!adminEmail) {
      throw new Error("Admin email not configured");
    }

    console.log("Sending order modification email to admin:", adminEmail);

    // Format the removed day for display
    const removedDayDate = new Date(removedDay);
    const removedDayDisplay = !isNaN(removedDayDate.getTime())
      ? removedDayDate.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : removedDay;

    // Format remaining days for display
    const remainingDaysHtml = remainingDays.map(day => {
      const dayDate = new Date(day);
      const dayDisplay = !isNaN(dayDate.getTime())
        ? dayDate.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : day;
      return `<li>${dayDisplay}</li>`;
    }).join("");

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject: `🔄 Zmena objednávky - ${userName}`,
      html: `
        <h2>Zákazník upravil objednávku</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Detail úpravy:</h3>
          <p><strong>Zákazník:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>ID objednávky:</strong> ${orderId}</p>
          <p><strong>Dátum objednávky:</strong> ${orderDate}</p>
          <p><strong>Odstránený deň:</strong> <span style="color: red; font-weight: bold;">${removedDayDisplay}</span></p>
          <h4>Zostávajúce dni v objednávke:</h4>
          <ul>
            ${remainingDaysHtml}
          </ul>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Tento email bol odoslaný automaticky zo systému.
        </p>
        <div style="background:#f9fafb;padding:30px;text-align:center;border-top:1px solid #e5e7eb;margin-top:30px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Profesionálne Stravovanie</p>
          <p style="margin:0;color:#9ca3af;font-size:12px;">Zdravé jedlo priamo k vám domov</p>
        </div>
      `,
    });

    console.log("Order modification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending order modification email:", error);
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
