import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderItems: Array<{
    name: string;
    size?: string;
    quantity: number;
    price: number;
  }>;
  totalPrice: number;
  deliveryFee: number;
  deliveryAddress: string;
  deliveryDate?: string;
  phone: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const orderData: OrderEmailRequest = await req.json();
    console.log("Processing order email for:", orderData.orderId);

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    
    if (!adminEmail) {
      console.error("ADMIN_EMAIL not configured");
      return new Response(
        JSON.stringify({ error: "Admin email not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order items HTML
    const orderItemsHtml = orderData.orderItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}${item.size ? ` (${item.size})` : ""}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(2)} €</td>
        </tr>
      `
      )
      .join("");

    // Customer confirmation email
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Potvrdenie objednávky</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Ďakujeme za objednávku!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dobrý deň ${orderData.customerName},</p>
            <p>Vaša objednávka bola úspešne prijatá a je v procese spracovania.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #667eea; margin-top: 0;">Detaily objednávky</h2>
              <p><strong>Číslo objednávky:</strong> ${orderData.orderId}</p>
              <p><strong>Adresa doručenia:</strong> ${orderData.deliveryAddress}</p>
              ${orderData.deliveryDate ? `<p><strong>Dátum doručenia:</strong> ${orderData.deliveryDate}</p>` : ""}
              <p><strong>Telefón:</strong> ${orderData.phone}</p>
              
              <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f0f0f0;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #667eea;">Položka</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #667eea;">Počet</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Cena</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">Doprava</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${orderData.deliveryFee.toFixed(2)} €</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; font-weight: bold; font-size: 18px;">SPOLU</td>
                    <td style="padding: 12px;"></td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #667eea;">${orderData.totalPrice.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p style="margin-top: 30px; color: #666;">Ak máte akékoľvek otázky, neváhajte nás kontaktovať.</p>
            <p style="color: #666;">S pozdravom,<br>Váš tím</p>
          </div>
        </body>
      </html>
    `;

    // Admin notification email
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Nová objednávka</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🔔 Nová objednávka</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Bola prijatá nová objednávka:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #f5576c; margin-top: 0;">Informácie o zákazníkovi</h2>
              <p><strong>Meno:</strong> ${orderData.customerName}</p>
              <p><strong>Email:</strong> ${orderData.customerEmail}</p>
              <p><strong>Telefón:</strong> ${orderData.phone}</p>
              <p><strong>Adresa:</strong> ${orderData.deliveryAddress}</p>
              ${orderData.deliveryDate ? `<p><strong>Dátum doručenia:</strong> ${orderData.deliveryDate}</p>` : ""}
              
              <h2 style="color: #f5576c; margin-top: 30px;">Detaily objednávky</h2>
              <p><strong>Číslo objednávky:</strong> ${orderData.orderId}</p>
              
              <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f0f0f0;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #f5576c;">Položka</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #f5576c;">Počet</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #f5576c;">Cena</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">Doprava</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${orderData.deliveryFee.toFixed(2)} €</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; font-weight: bold; font-size: 18px;">SPOLU</td>
                    <td style="padding: 12px;"></td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #f5576c;">${orderData.totalPrice.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send customer confirmation email
    const customerEmailResponse = await resend.emails.send({
      from: "Objednávky <onboarding@resend.dev>",
      to: [orderData.customerEmail],
      subject: `Potvrdenie objednávky #${orderData.orderId.slice(0, 8)}`,
      html: customerEmailHtml,
    });

    console.log("Customer email sent:", customerEmailResponse);

    // Send admin notification email
    const adminEmailResponse = await resend.emails.send({
      from: "Objednávky <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `Nová objednávka od ${orderData.customerName}`,
      html: adminEmailHtml,
    });

    console.log("Admin email sent:", adminEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        customerEmail: customerEmailResponse,
        adminEmail: adminEmailResponse 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
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
