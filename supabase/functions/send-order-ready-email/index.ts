import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderReadyEmailRequest {
  orderId: string;
  customerName: string;
  customerEmail: string;
  deliveryDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing order ready email request");

    const fromEmail = Deno.env.get("FROM_EMAIL");

    if (!fromEmail) {
      console.error("FROM_EMAIL not configured");
      return new Response(JSON.stringify({ error: "Sender email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId, customerName, customerEmail, deliveryDate }: OrderReadyEmailRequest = await req.json();

    console.log("Sending order ready email to:", customerEmail);
    console.log("Delivery date received:", deliveryDate);

    // Format the order ID for display (first 8 characters)
    const orderIdShort = orderId.slice(0, 8);

    // Format the delivery date - parse as local date (YYYY-MM-DD)
    const [year, month, day] = deliveryDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    const formattedDate = dateObj.toLocaleDateString("sk-SK", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create the email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vaša objednávka je pripravená</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                🎉 Vaša objednávka je pripravená!
              </h1>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 18px; color: #1f2937; line-height: 1.6;">
                Dobrý deň <strong>${customerName}</strong>,
              </p>
              
              <p style="margin: 0 0 30px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                S radosťou vám oznamujeme, že vaša objednávka je pripravená a čoskoro sa k vám vydá na cestu! 🚗
              </p>

              <!-- Order details box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Číslo objednávky:</span>
                        </td>
                        <td align="right" style="padding: 8px 0;">
                          <strong style="color: #1f2937; font-size: 14px;">#${orderIdShort}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Dátum doručenia:</span>
                        </td>
                        <td align="right" style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <strong style="color: #1f2937; font-size: 14px;">${formattedDate}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Delivery time highlight -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #ffffff; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                      Čas doručenia
                    </p>
                    <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      18:00 - 21:00
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                Prosím, pripravte sa na prevzatie vašej objednávky a pripravte si hotovosť v celej sume objednávky v uvedenom časovom okne. Náš vodič vám zavolá pred doručením.
              </p>
              <p style="margin: 0; font-size: 16px; color: #1f2937; line-height: 1.6; text-align: center;">
                Ďakujeme za vašu dôveru a prajeme dobrú chuť! 🍽️
              </p>
          

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                VIP Krabičky
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Zdravé jedlo priamo k vám domov
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: `Profesionálne Stravovanie <${fromEmail}>`,
      to: [customerEmail],
      subject: `🎉 Vaša objednávka #${orderIdShort} je pripravená!`,
      html: emailHtml,
    });

    console.log("Order ready email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-ready-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
