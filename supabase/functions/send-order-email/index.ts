import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Escape HTML to prevent injection attacks
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    days?: Array<{
      day: string;
      meals: Array<{
        category: string;
        name: string;
      }>;
    }>;
  }>;
  totalPrice: number;
  deliveryFee: number;
  deliveryAddress: string;
  deliveryDate?: string;
  orderDate?: string;
  phone: string;
  note?: string;
  allergies?: string[];
  dislikes?: string[];
  menuSize?: string;
  calories?: number;
  deliveryType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const orderData: OrderEmailRequest = await req.json();
    console.log("Wrapping up a lovely order email for:", JSON.stringify(orderData, null, 2));

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const fromEmail = Deno.env.get("FROM_EMAIL");

    if (!adminEmail) {
      console.error("ADMIN_EMAIL is missing!");
      return new Response(JSON.stringify({ error: "Admin email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fromEmail) {
      console.error("FROM_EMAIL is hiding somewhere!");
      return new Response(JSON.stringify({ error: "Sender email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current date for order
    const currentDate = new Date().toLocaleDateString("sk-SK", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format menuSize and calories with fallbacks
    const menuSize = orderData.menuSize || "Nie je špecifikované";
    const calories = orderData.calories ? `${orderData.calories} kcal` : "Nie je špecifikované";
    const deliveryType = orderData.deliveryType || "Jednorazové";
    const note = orderData.note || "Žiadna poznámka";

    const formatMenuSize = (menuSize: string): string => {
      console.log("Formatting menuSize:", menuSize);
      switch (menuSize.toLowerCase()) {
        case "vegetarian":
          return "Vegetariánske";
        case "standard":
          return "Štandardné";
        default:
          return menuSize;
      }
    };

    const formatCalories = (calories: string): string => {
      return calories;
    };

    // Calculate delivery dates with validation and fallback
    const getDeliveryDates = (): string[] => {
      const deliveryDates = new Set<string>();
      if (orderData.deliveryDate) {
        const deliveryDate = new Date(orderData.deliveryDate);
        if (!isNaN(deliveryDate.getTime())) {
          deliveryDate.setDate(deliveryDate.getDate() - 1); // Evening before
          deliveryDates.add(
            deliveryDate.toLocaleDateString("sk-SK", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          );
        }
      } else if (orderData.orderItems?.length) {
        orderData.orderItems.forEach((item) => {
          if (item.days?.length) {
            item.days.forEach((dayObj) => {
              const orderedDate = new Date(dayObj.day);
              if (!isNaN(orderedDate.getTime())) {
                const deliveryDate = new Date(orderedDate);
                deliveryDate.setDate(deliveryDate.getDate() - 1);
                deliveryDates.add(
                  deliveryDate.toLocaleDateString("sk-SK", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                );
              }
            });
          }
        });
      }
      const datesArray = Array.from(deliveryDates);
      return datesArray.length > 0 ? datesArray : [currentDate];
    };

    // Get delivery time based on location
    const getDeliveryTime = (address: string): string => {
      const lowerAddress = address.toLowerCase();
      if (lowerAddress.includes("nitra") || lowerAddress.includes("okolie")) {
        return "17:00 - 19:00";
      } else if (lowerAddress.includes("bratislava") || lowerAddress.includes("smer bratislava")) {
        return "19:00 - 21:00";
      }
      return "18:00 - 21:00"; // Default time
    };

    const deliveryDates = getDeliveryDates();
    const deliveryTime = getDeliveryTime(orderData.deliveryAddress);

    // Clean, flat preferences section (no background/border)
    const allergies = orderData.allergies?.length ? orderData.allergies : ["Žiadne"];
    const dislikes = orderData.dislikes?.length ? orderData.dislikes : ["Žiadne"];
    const preferencesSection = `
      <div style="margin: 20px 0; padding: 10px 0;">
        <h3 style="color: #92400e; margin: 0 0 10px; font-weight: bold;">Osobné preferencie</h3>
        <p style="margin: 5px 0;"><strong>Alergie:</strong> ${allergies.map(a => escapeHtml(a)).join(", ")}</p>
        <p style="margin: 5px 0;"><strong>Neobľúbené jedlá:</strong> ${dislikes.map(d => escapeHtml(d)).join(", ")}</p>
      </div>
    `;

    // Create order items HTML
    const orderItemsHtml = orderData.orderItems
      .map((item) => {
        let itemHtml = `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.name)}${item.size ? ` (${escapeHtml(item.size)})` : ""}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(2)} €</td>
        </tr>`;
        if (item.days?.length) {
          const categoryLabels: Record<string, string> = {
            breakfast: "Raňajky",
            lunch: "Obed",
            dinner: "Večera",
          };
          const daysHtml = item.days
            .map((day) => {
              const mealsHtml = day.meals
                .map(
                  (meal) =>
                    `<div style="margin-left: 15px; color: #666;">• ${escapeHtml(categoryLabels[meal.category] || meal.category)}: ${escapeHtml(meal.name)}</div>`,
                )
                .join("");
              return `
        <tr>
          <td colspan="3" style="padding: 4px 8px 8px 20px; border-bottom: 1px solid #f0f0f0;">
            <div style="font-weight: 600; color: #667eea; margin-bottom: 4px;">${day.day}</div>
            ${mealsHtml}
          </td>
        </tr>`;
            })
            .join("");
          itemHtml += daysHtml;
        }
        return itemHtml;
      })
      .join("");

    // === CUSTOMER EMAIL HTML ===
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Potvrdenie objednávky</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Ďakujeme za objednávku!</h1>
          </div>
         
          <div style="background: #f9f9f9; padding: 30px;">
            <p style="font-size: 16px;">Dobrý deň ${escapeHtml(orderData.customerName)},</p>
            <p>Vaša objednávka bola úspešne prijatá a už ju s láskou pripravujeme!</p>
           
            <!-- Clean order info block -->
            <div style="margin: 20px 0; padding: 10px 0;">
              <p style="margin: 5px 0;"><strong>Číslo objednávky:</strong> #${orderData.orderId.slice(0, 8)}</p>
              <p style="margin: 5px 0;"><strong>Dátum objednávky:</strong> ${currentDate}</p>
            </div>

            <div style="background: white; padding: 20px; margin: 20px 0;">
              <h2 style="color: #667eea; margin-top: 0;">Detaily objednávky</h2>
              <p><strong>Typ menu:</strong> ${formatMenuSize(menuSize)}</p>
              <p><strong>Kalórie:</strong> ${formatCalories(calories)}</p>
              <p><strong>Typ doručenia:</strong> ${deliveryType === "weekly" ? "Týždenné menu" : "Jednorazové"}</p>
             
              <h3 style="color: #667eea; margin: 20px 0 10px;">Obsah objednávky</h3>
             
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

              ${preferencesSection}

              <h3 style="color: #667eea; margin: 20px 0 10px;">Doručenie</h3>
              <p><strong>Adresa:</strong> ${escapeHtml(orderData.deliveryAddress)}</p>
              <p><strong>Telefón:</strong> ${escapeHtml(orderData.phone)}</p>
              <p><strong>Poznámka:</strong> ${escapeHtml(note)}</p>

              <!-- Clean delivery time block -->
              <div style="margin: 20px 0; padding: 10px 0;">
                <h4 style="color: #065f46; margin: 0 0 10px; font-weight: bold;">Čas doručenia</h4>
                ${deliveryDates
                  .map(
                    (date) => `
                    <p style="margin: 5px 0;"><strong>${date}</strong>, ${deliveryTime}</p>
                  `,
                  )
                  .join("")}
              </div>

              <p style="color: #1f2937;">Prosím, pripravte sa na prevzatie vašej objednávky a hotovosť v celej sume objednávky v uvedenom časovom okne. Náš vodič vám zavolá pred doručením. Ďakujeme za vašu dôveru a prajeme dobrú chuť!</p>
            </div>
          </div>

          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">VIP Krabičky</p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">Zdravé jedlo priamo k vám domov</p>
          </div>
        </body>
      </html>
    `;

    // === ADMIN EMAIL HTML ===
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Nová objednávka</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f093fb; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Nová objednávka</h1>
          </div>
         
          <div style="background: #f9f9f9; padding: 30px;">
            <p style="font-size: 16px;">Bola prijatá nová objednávka:</p>
           
            <!-- Clean order info block -->
            <div style="margin: 20px 0; padding: 10px 0;">
              <p style="margin: 5px 0;"><strong>Číslo objednávky:</strong> #${orderData.orderId.slice(0, 8)}</p>
              <p style="margin: 5px 0;"><strong>Dátum objednávky:</strong> ${currentDate}</p>
            </div>

            <div style="background: white; padding: 20px; margin: 20px 0;">
              <h2 style="color: #f5576c; margin-top: 0;">Detaily objednávky</h2>
              <p><strong>Typ menu:</strong> ${formatMenuSize(menuSize)}</p>
              <p><strong>Kalórie:</strong> ${formatCalories(calories)}</p>
              <p><strong>Typ doručenia:</strong> ${deliveryType === "weekly" ? "Týždenné menu" : "Jednorazové"}</p>
             
              <h3 style="color: #f5576c; margin: 20px 0 10px;">Obsah objednávky</h3>
             
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

              ${preferencesSection}

              <h3 style="color: #f5576c; margin: 20px 0 10px;">Kontakt zákazníka</h3>
              <p><strong>Meno:</strong> ${escapeHtml(orderData.customerName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(orderData.customerEmail)}</p>
              <p><strong>Telefón:</strong> ${escapeHtml(orderData.phone)}</p>
              <p><strong>Adresa:</strong> ${escapeHtml(orderData.deliveryAddress)}</p>
              <p><strong>Poznámka:</strong> ${escapeHtml(note)}</p>
            </div>
          </div>

          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">VIP Krabičky</p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">Zdravé jedlo priamo k vám domov</p>
          </div>
        </body>
      </html>
    `;

    // Send customer email
    const customerEmailResponse = await resend.emails.send({
      from: `Profesionálne Stravovanie <${fromEmail}>`,
      to: [orderData.customerEmail],
      subject: `Potvrdenie objednávky #${orderData.orderId.slice(0, 8)}`,
      html: customerEmailHtml,
    });

    console.log("Customer email sent:", JSON.stringify(customerEmailResponse, null, 2));

    // Send admin email
    const adminEmailResponse = await resend.emails.send({
      from: `Profesionálne Stravovanie <${fromEmail}>`,
      to: [adminEmail],
      subject: "Nová objednávka",
      html: adminEmailHtml,
    });

    console.log("Admin email sent:", JSON.stringify(adminEmailResponse, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        customerEmail: customerEmailResponse,
        adminEmail: adminEmailResponse,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
