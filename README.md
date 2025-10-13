VIP PROFESIONÁLNE KRABIČKOVÉ STRAVOVANIE
Jedz zdravo. Sleduj progres. Dosiahni svoj cieľ.

Luxusná webová aplikácia pre profesionálne krabičkové stravovanie, kombinujúca personalizovanú výživu, online objednávky a prehľad o progrese používateľa.
Celý projekt je vytvorený v prémiovom black & gold dizajne.

⸻

PROJEKTOVÁ VÍZIA

VIP Profesionálne Krabičkové Stravovanie je moderná webová platforma určená pre klientov, ktorí chcú:
• mať zdravé, presne vyrátané jedlá bez starostí,
• sledovať svoj fyzický progres a odporúčania,
• objednávať jednoducho a elegantne,
• zažiť luxusný digitálny zážitok s dôrazom na estetiku.

⸻

HLAVNÉ FUNKCIE

1. Landing Page
   Prémiový čierno-zlatý dizajn s animáciami, sloganom a sekciami ako „Prečo krabičkovať?“, „Premeny“ a „Fakty o stravovaní“.
2. Menu systém
   Dynamické načítanie aktuálneho týždenného menu zo Supabase.
   Používateľ môže pridať jedlá do košíka podľa veľkosti menu (S–XXL).
3. Košík / Checkout
   Používateľ vyberá jedlá, doplní kontaktné údaje, adresa a telefón sa automaticky ukladajú do profilu.
   Platba prebieha v hotovosti pri doručení.
4. Používateľský účet
   Úvodný dotazník (onboarding) pre uloženie údajov ako vek, výška, cieľ, aktivita a alergie.
5. Dashboard
   Prehľad cieľov, váhy, graf progresu a odporúčaná veľkosť denného menu.
6. Admin Dashboard
   Správa objednávok, zostavenie týždenného menu, úprava a mazanie jedál, automatické notifikácie o nových objednávkach. 7. AI Integrácia (v príprave)
   Automatické generovanie
   7-dňového menu podľa cieľa, alergií a rozpočtu používateľa.
7. Informačné podstránky
   Cenník, Doprava, O nás – jednotný čierno-zlatý dizajn, textový obsah podľa sekcií.

⸻

DATABÁZOVÁ ŠTRUKTÚRA (SUPABASE)

users
id, email, password, created_at

user_profiles
id, user_id, name, age, height, weight, goal, activity, allergies, preferences, phone, address, updated_at

menu_items
id, name, description, price, proteins, carbs, fats, allergens, image_url, created_at

weekly_menus
id, start_date, end_date, items (jsonb), created_at

orders
id, user_id, menu_id, items (jsonb), menu_size, total_price, delivery_type, delivery_date, address, phone, note, status, created_at

progress
id, user_id, date, weight, photo_url

admin_notifications
id, order_id, seen, created_at

⸻

ROUTING (Next.js App Router)

Cesta / Funkcia
/ - Landing Page
/menu - Aktuálne týždenné menu + história
/cart - Košík a checkout
/onboarding - Dotazník pri prvom prihlásení
/dashboard - Prehľad používateľa a progres
/settings - Úprava profilu
/admin - Prehľad objednávok pre admina
/admin/menu-builder - Týždenné menu builder
/cennik - Stránka s cenníkom
/doprava - Informácie o donáške
/onas - O mne, profil trénera

⸻

TECH STACK

Frontend: Next.js, TypeScript, TailwindCSS
Backend / Database: Supabase, PostgreSQL
AI Integrácia: OpenAI GPT-4 Turbo (api/ai-mealplan, api/ai-chat)
UI knižnice: shadcn/ui, Lucide Icons, Recharts (grafy)

⸻

DIZAJN A UX

Farby:
• Pozadie: #000000
• Text: #FFFFFF
• Akcent: #FFD700

Fonty:
Playfair Display (nadpisy), Inter (texty)

Efekty:
Fade-in animácie, parallax efekty, hover glow

Responzivita:
Optimalizované pre desktop aj mobil

Celkový štýl:
VIP Black & Gold – minimalistický, luxusný, profesionálny

⸻

POUŽÍVATEĽSKÝ FLOW 1. Používateľ sa prihlási alebo vyplní úvodný dotazník. 2. Na stránke Menu si vyberie jedlá a zvolí veľkosť denného menu (S–XXL). 3. V Košíku doplní kontaktné údaje (email, adresa, telefón). 4. Objednávka sa uloží do tabuľky orders a admin dostane notifikáciu. 5. Používateľ vidí potvrdenie a môže sledovať svoj progres v dashboarde. 6. Admin má prehľad o všetkých objednávkach a menu cez svoj dashboard.

⸻

SETUP A SPUSTENIE PROJEKTU 1. Klonovanie projektu
git clone https://github.com/yourusername/vip-krabickove-stravovanie.git
cd vip-krabickove-stravovanie 2. Inštalácia závislostí
npm install 3. Konfigurácia prostredia (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key 4. Spustenie projektu
npm run dev
Projekt beží na http://localhost:3000

⸻

DEPLOYMENT

Frontend: Lovable
Backend a databáza: Supabase
Emailové notifikácie: Resend API

⸻

ROADMAP

✓ Landing Page a CTA
✓ Dynamické týždenné menu
✓ Košík a objednávkový systém
✓ Admin dashboard
✓ Onboarding a používateľský profil
• AI Mealplan generátor (pripravuje sa)
• Mobilná verzia (Expo + NativeWind)
• Push notifikácie pre nové menu

⸻

AUTOR

Patrik Rigodanzo
Tréner, rekordman a zakladateľ VIP Profesionálne Krabičkové Stravovanie
Instagram: @patrik.rigodanzo

⸻

CREDITS

Developed by Nikolas Pastier
© 2025 VIP Profesionálne Krabičkové Stravovanie – Všetky práva vyhradené
