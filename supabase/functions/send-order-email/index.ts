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
    days?: Array<{
      day: string; // ISO date string, e.g. "2025-10-27"
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
    console.log("Order data:", JSON.stringify(orderData, null, 2));

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const fromEmail = Deno.env.get("FROM_EMAIL");
    if (!adminEmail || !fromEmail) {
      return new Response(JSON.stringify({ error: "Missing admin / from email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -----------------------------------------------------------------
    // 1. Current order date (used only for fallback)
    // -----------------------------------------------------------------
    const currentDate = new Date().toLocaleDateString("sk-SK", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // -----------------------------------------------------------------
    // 2. Helpers
    // -----------------------------------------------------------------
    const menuSize = orderData.menuSize || "Nie je špecifikované";
    const calories = orderData.calories ? `${orderData.calories} kcal` : "Nie je špecifikované";
    const deliveryType = orderData.deliveryType || "Jednorazové";
    const note = orderData.note || "Žiadna poznámka";

    const formatMenuSize = (s: string) => {
      switch (s.toLowerCase()) {
        case "vegetarian":
          return "Vegetariánske";
        case "standard":
          return "Štandardné";
        default:
          return s;
      }
    };

    // -----------------------------------------------------------------
    // 3. Delivery time based on address (unchanged)
    // -----------------------------------------------------------------
    const getDeliveryTime = (address: string): string => {
      const a = address.toLowerCase();
      if (a.includes("nitra") || a.includes("okolie")) return "17:00 - 19:00";
      if (a.includes("bratislava") || a.includes("smer bratislava")) return "19:00 - 21:00";
      return "18:00 - 21:00";
    };
    const deliveryTime = getDeliveryTime(orderData.deliveryAddress);

    // -----------------------------------------------------------------
    // 4. Build **per-day** delivery information
    // -----------------------------------------------------------------
    interface DeliveryInfo {
      orderedDay: string; // e.g. "pondelok 27. októbra 2025"
      deliveryDay: string; // evening before → "nedeľa 26. októbra 2025"
    }

    const deliveryInfos: DeliveryInfo[] = [];

    // Collect every day that appears in any orderItem
    const daySet = new Set<string>();
    orderData.orderItems.forEach((item) => {
      item.days?.forEach((d) => daySet.add(d.day));
    });

    daySet.forEach((iso) => {
      const ordered = new Date(iso);
      if (isNaN(ordered.getTime())) return;

      const delivery = new Date(ordered);
      delivery.setDate(delivery.getDate() - 1); // evening before

      deliveryInfos.push({
        orderedDay: ordered.toLocaleDateString("sk-SK", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        deliveryDay: delivery.toLocaleDateString("sk-SK", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });
    });

    // Fallback – if nothing was found (should never happen for normal orders)
    if (!deliveryInfos.length) {
      deliveryInfos.push({ orderedDay: currentDate, deliveryDay: currentDate });
    }

    // -----------------------------------------------------------------
    // 5. Preferences (no background / border)
    // -----------------------------------------------------------------
    const allergies = orderData.allergies?.length ? orderData.allergies : ["Žiadne"];
    const dislikes = orderData.dislikes?.length ? orderData.dislikes : ["Žiadne"];
    const preferencesSection = `
      <div style="margin:20px 0;padding:10px 0;">
        <h3 style="color:#92400e;margin:0 0 10px;font-weight:bold;">Osobné preferencie</h3>
        <p style="margin:5px 0;"><strong>Alergie:</strong> ${allergies.join(", ")}</p>
        <p style="margin:5px 0;"><strong>Neobľúbené jedlá:</strong> ${dislikes.join(", ")}</p>
      </div>
    `;

    // -----------------------------------------------------------------
    // 6. Order-items table (unchanged)
    // -----------------------------------------------------------------
    const orderItemsHtml = orderData.orderItems
      .map((item) => {
        let html = `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">
              ${item.name}${item.size ? ` (${item.size})` : ""}
            </td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.price.toFixed(2)} €</td>
          </tr>`;

        if (item.days?.length) {
          const cat: Record<string, string> = { breakfast: "Raňajky", lunch: "Obed", dinner: "Večera" };
          const daysHtml = item.days
            .map((d) => {
              const meals = d.meals
                .map(
                  (m) =>
                    `<div style="margin-left:15px;color:#666;">• ${cat[m.category] ?? m.category}: ${m.name}</div>`,
                )
                .join("");
              return `
                <tr>
                  <td colspan="3" style="padding:4px 8px 8px 20px;border-bottom:1px solid #f0f0f0;">
                    <div style="font-weight:600;color:#667eea;margin-bottom:4px;">
                      ${new Date(d.day).toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    ${meals}
                  </td>
                </tr>`;
            })
            .join("");
          html += daysHtml;
        }
        return html;
      })
      .join("");

    // -----------------------------------------------------------------
    // 7. CUSTOMER EMAIL
    // -----------------------------------------------------------------
    const customerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Potvrdenie objednávky</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#667eea;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;">
    <h1 style="color:white;margin:0;">Ďakujeme za objednávku!</h1>
  </div>

  <div style="background:#f9f9f9;padding:30px;">
    <p style="font-size:16px;">Dobrý deň ${orderData.customerName},</p>
    <p>Vaša objednávka bola úspešne prijatá a už ju s láskou pripravujeme!</p>

    <!-- Order number / date (no box) -->
    <div style="margin:20px 0;padding:10px 0;">
      <p style="margin:5px 0;"><strong>Číslo objednávky:</strong> #${orderData.orderId.slice(0, 8)}</p>
      <p style="margin:5px 0;"><strong>Dátum objednávky:</strong> ${currentDate}</p>
    </div>

    <div style="background:white;padding:20px;margin:20px 0;">
      <h2 style="color:#667eea;margin-top:0;">Detaily objednávky</h2>
      <p><strong>Typ menu:</strong> ${formatMenuSize(menuSize)}</p>
      <p><strong>Kalórie:</strong> ${calories}</p>
      <p><strong>Typ doručenia:</strong> ${deliveryType === "weekly" ? "Týždenné menu" : "Jednorazové"}</p>

      <h3 style="color:#667eea;margin:20px 0 10px;">Obsah objednávky</h3>
      <table style="width:100%;margin-top:20px;border-collapse:collapse;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:10px;text-align:left;border-bottom:2px solid #667eea;">Položka</th>
            <th style="padding:10px;text-align:center;border-bottom:2px solid #667eea;">Počet</th>
            <th style="padding:10px;text-align:right;border-bottom:2px solid #667eea;">Cena</th>
          </tr>
        </thead>
        <tbody>
          ${orderItemsHtml}
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">Doprava</td>
            <td style="padding:8px;border-bottom:1px solid #eee;"></td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${orderData.deliveryFee.toFixed(2)} €</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:bold;font-size:18px;">SPOLU</td>
            <td style="padding:12px;"></td>
            <td style="padding:12px;text-align:right;font-weight:bold;font-size:18px;color:#667eea;">
              ${orderData.totalPrice.toFixed(2)} €
            </td>
          </tr>
        </tbody>
      </table>

      ${preferencesSection}

      <h3 style="color:#667eea;margin:20px 0 10px;">Doručenie</h3>
      <p><strong>Adresa:</strong> ${orderData.deliveryAddress}</p>
      <p><strong>Telefón:</strong> ${orderData.phone}</p>
      <p><strong>Poznámka:</strong> ${note}</p>

      <!-- NEW PER-DAY DELIVERY BLOCK -->
      <div style="margin:20px 0;padding:10px 0;">
        <h4 style="color:#d97706;margin:0 0 12px;font-weight:bold;">
          Dátum doručenia
        </h4>
        ${deliveryInfos
          .map(
            (info) => `
          <p style="margin:6px 0;">
            <strong>${info.orderedDay}</strong> → doručenie <strong>${info.deliveryDay}</strong>, ${deliveryTime}
          </p>`,
          )
          .join("")}
      </div>

      <p style="color:#1f2937;">
        Prosím, pripravte sa na prevzatie objednávky a hotovosť v celej sume v uvedenom časovom okne.
        Náš vodič vám zavolá pred doručením. Ďakujeme za dôveru a prajeme dobrú chuť!
      </p>
    </div>
  </div>

  <div style="background:#f9fafb;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">VIP Krabičky</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">Zdravé jedlo priamo k vám domov</p>
  </div>
</body>
</html>
`;

    // -----------------------------------------------------------------
    // 8. ADMIN EMAIL (unchanged except the same clean blocks)
    // -----------------------------------------------------------------
    const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Nová objednávka</title></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#f093fb;background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);padding:30px;text-align:center;">
    <h1 style="color:white;margin:0;">Nová objednávka</h1>
  </div>

  <div style="background:#f9f9f9;padding:30px;">
    <p style="font-size:16px;">Bola prijatá nová objednávka:</p>

    <div style="margin:20px 0;padding:10px 0;">
      <p style="margin:5px 0;"><strong>Číslo objednávky:</strong> #${orderData.orderId.slice(0, 8)}</p>
      <p style="margin:5px 0;"><strong>Dátum objednávky:</strong> ${currentDate}</p>
    </div>

    <div style="background:white;padding:20px;margin:20px 0;">
      <h2 style="color:#f5576c;margin-top:0;">Detaily objednávky</h2>
      <p><strong>Typ menu:</strong> ${formatMenuSize(menuSize)}</p>
      <p><strong>Kalórie:</strong> ${calories}</p>
      <p><strong>Typ doručenia:</strong> ${deliveryType === "weekly" ? "Týždenné menu" : "Jednorazové"}</p>

      <h3 style="color:#f5576c;margin:20px 0 10px;">Obsah objednávky</h3>
      <table style="width:100%;margin-top:20px;border-collapse:collapse;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:10px;text-align:left;border-bottom:2px solid #f5576c;">Položka</th>
            <th style="padding:10px;text-align:center;border-bottom:2px solid #f5576c;">Počet</th>
            <th style="padding:10px;text-align:right;border-bottom:2px solid #f5576c;">Cena</th>
          </tr>
        </thead>
        <tbody>
          ${orderItemsHtml}
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">Doprava</td>
            <td style="padding:8px;border-bottom:1px solid #eee;"></td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${orderData.deliveryFee.toFixed(2)} €</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:bold;font-size:18px;">SPOLU</td>
            <td style="padding:12px;"></td>
            <td style="padding:12px;text-align:right;font-weight:bold;font-size:18px;color:#f5576c;">
              ${orderData.totalPrice.toFixed(2)} €
            </td>
          </tr>
        </tbody>
      </table>

      ${preferencesSection}

      <h3 style="color:#f5576c;margin:20px 0 10px;">Kontakt zákazníka</h3>
      <p><strong>Meno:</strong> ${orderData.customerName}</p>
      <p><strong>Email:</strong> ${orderData.customerEmail}</p>
      <p><strong>Telefón:</strong> ${orderData.phone}</p>
      <p><strong>Adresa:</strong> ${orderData.deliveryAddress}</p>
      <p><strong>Poznámka:</strong> ${note}</p>
    </div>
  </div>

  <div style="background:#f9fafb;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">VIP Krabičky</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">Zdravé jedlo priamo k vám domov</p>
  </div>
</body>
</html>
`;

    // -----------------------------------------------------------------
    // 9. SEND EMAILS
    // -----------------------------------------------------------------
    const custRes = await resend.emails.send({
      from: `Profesionálne Stravovanie <${fromEmail}>`,
      to: [orderData.customerEmail],
      subject: `Potvrdenie objednávky #${orderData.orderId.slice(0, 8)}`,
      html: customerEmailHtml,
    });

    const adminRes = await resend.emails.send({
      from: `Profesionálne Stravovanie <${fromEmail}>`,
      to: [adminEmail],
      subject: "Nová objednávka",
      html: adminEmailHtml,
    });

    return new Response(JSON.stringify({ success: true, customerEmail: custRes, adminEmail: adminRes }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
