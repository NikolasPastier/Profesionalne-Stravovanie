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
  items: Array<{
    day: string;
    meals: Array<{
      name: string;
      category: string;
    }>;
  }>;
  menuSize: string;
  calories: number;
  deliveryType: string;
  totalPrice: number;
  deliveryFee: number;
  deliveryAddress: string;
  phone: string;
  note?: string;
  allergies?: string[];
  dislikes?: string[];
}

// Helper function to get the delivery date (day before the meal day)
function getDeliveryDateForMealDay(mealDay: string, orderDate: Date): string {
  const daysOfWeek = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];
  const dayIndex = daysOfWeek.indexOf(mealDay);

  if (dayIndex === -1) return ""; // Invalid day

  // Create a date object for the current week's Monday
  const today = new Date(orderDate);
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);

  // Calculate the meal date (current week's meal day)
  const mealDate = new Date(monday);
  mealDate.setDate(monday.getDate() + dayIndex);

  // Delivery is the day before the meal day
  const deliveryDate = new Date(mealDate);
  deliveryDate.setDate(mealDate.getDate() - 1);

  // Format the delivery date
  return deliveryDate.toLocaleDateString("sk-SK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

    const {
      orderId,
      customerName,
      customerEmail,
      deliveryDate,
      items,
      menuSize,
      calories,
      deliveryType,
      totalPrice,
      deliveryFee,
      deliveryAddress,
      phone,
      note,
      allergies = [],
      dislikes = [],
    }: OrderReadyEmailRequest = await req.json();

    console.log("Sending order ready email to:", customerEmail);
    console.log("Delivery date received:", deliveryDate);

    // Format the order ID for display (first 8 characters)
    const orderIdShort = orderId.slice(0, 8);

    // Use current date as the reference for order creation
    const orderCreationDate = new Date();

    // Determine delivery time based on address
    const address = deliveryAddress.toLowerCase();
    const bratislavaRegion = [
      "trnava",
      "sereď",
      "sered",
      "bratislava",
      "pezinok",
      "senec",
      "malacky",
      "dunajská streda",
    ];

    let deliveryTime = "17:00 - 19:00"; // Default for Nitra and surroundings

    // Check if address contains any Bratislava region city
    if (bratislavaRegion.some((city) => address.includes(city))) {
      deliveryTime = "19:00 - 21:00";
    }

    console.log(`Delivery address: ${deliveryAddress}, Delivery time: ${deliveryTime}`);

    // Create items list HTML with meal categories and delivery dates
    const itemsHtml = items
      .map((dayItem) => {
        const deliveryDateFormatted = getDeliveryDateForMealDay(dayItem.day, orderCreationDate);
        return `
      <div style="margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="color: #10b981; margin: 0 0 12px; font-size: 18px; font-weight: 600;">
          ${dayItem.day} (Doručenie: ${deliveryDateFormatted})
        </h3>
        <div style="margin-left: 12px;">
          ${dayItem.meals
            .map((meal) => {
              const categoryLabel =
                meal.category === "breakfast" ? "🍳 Raňajky" : meal.category === "lunch" ? "🍽️ Obed" : "🌙 Večera";
              return `
              <div style="margin-bottom: 8px;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">${categoryLabel}</div>
                <div style="color: #1f2937; font-size: 14px;">${meal.name}</div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
      })
      .join("");

    // Create preferences section if there are any
    const preferencesHtml =
      allergies.length > 0 || dislikes.length > 0
        ? `
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px; background-color: #fef3c7; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="margin: 0 0 12px; color: #92400e; font-size: 16px; font-weight: 600;">⚠️ Osobné preferencie</h3>
            ${
              allergies.length > 0
                ? `
              <div style="margin-bottom: 8px;">
                <strong style="color: #92400e; font-size: 14px;">Alergie:</strong>
                <span style="color: #78350f; font-size: 14px; margin-left: 8px;">${allergies.join(", ")}</span>
              </div>
            `
                : ""
            }
            ${
              dislikes.length > 0
                ? `
              <div>
                <strong style="color: #92400e; font-size: 14px;">Neobľúbené jedlá:</strong>
                <span style="color: #78350f; font-size: 14px; margin-left: 8px;">${dislikes.join(", ")}</span>
              </div>
            `
                : ""
            }
          </td>
        </tr>
      </table>
    `
        : "";

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

              <!-- Order number and date -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border-radius: 8px; margin-bottom: 24px; border: 2px solid #10b981;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #065f46; font-size: 14px; font-weight: 600;">Číslo objednávky:</span>
                        </td>
                        <td align="right" style="padding: 8px 0;">
                          <strong style="color: #047857; font-size: 16px;">#${orderIdShort}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px; font-weight: 600;">Detaily objednávky</h2>
                    
                    <!-- Order summary -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Typ menu:</span>
                        </td>
                        <td align="right" style="padding: 8px 0;">
                          <strong style="color: #1f2937; font-size: 14px;">${menuSize}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Kalórie:</span>
                        </td>
                        <td align="right" style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <strong style="color: #1f2937; font-size: 14px;">${calories} kcal</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Typ doručenia:</span>
                        </td>
                        <td align="right" style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <strong style="color: #1f2937; font-size: 14px;">${deliveryType === "weekly" ? "Týždenné menu" : "Jednorazové"}</strong>
                        </td>
                      </tr>
                    </table>

                    <h3 style="margin: 24px 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">Obsah objednávky</h3>
                    <div style="margin-bottom: 16px;">
                      ${itemsHtml}
                    </div>
                    
                    ${preferencesHtml}

                    <!-- Delivery info -->
                    <h3 style="margin: 24px 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">Doručenie</h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Adresa:</span>
                        </td>
                        <td align="right" style="padding: 8px 0;">
                          <strong style="color: #1f2937; font-size: 14px;">${deliveryAddress}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Telefón:</span>
                        </td>
                        <td align="right" style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                          <strong style="color: #1f2937; font-size: 14px;">${phone}</strong>
                        </td>
                      </tr>
                      ${
                        note
                          ? `
                        <tr>
                          <td colspan="2" style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">Poznámka:</span>
                            <p style="margin: 0; color: #1f2937; font-size: 14px; background-color: #fef3c7; padding: 8px; border-radius: 4px;">${note}</p>
                          </td>
                        </tr>
                      `
                          : ""
                      }
                    </table>

                    <!-- Price summary -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px;">
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Cena menu:</span>
                        </td>
                        <td align="right" style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #1f2937; font-size: 14px;">${(totalPrice - deliveryFee).toFixed(2)} €</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Doprava:</span>
                        </td>
                        <td align="right" style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #1f2937; font-size: 14px;">${deliveryFee.toFixed(2)} €</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px;">
                          <span style="color: #ffffff; font-size: 18px; font-weight: bold;">SPOLU:</span>
                        </td>
                        <td align="right" style="padding: 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px;">
                          <strong style="color: #ffffff; font-size: 22px;">${totalPrice.toFixed(2)} €</strong>
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
                      ${deliveryTime}
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
