import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userProfile, progressData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare context about user's progress
    const latestWeight = progressData.length > 0 ? progressData[progressData.length - 1].weight : userProfile.weight;
    const goalWeight = userProfile.goal === 'hubnutie' ? userProfile.weight * 0.9 : userProfile.weight * 1.1;
    const weightChange = progressData.length > 1 ? 
      progressData[progressData.length - 1].weight - progressData[0].weight : 0;

    const systemPrompt = `Si profesionálny fitness a výživový poradca. Analyzuj progres používateľa a poskytni stručné, motivujúce odporúčania.

Profil používateľa:
- Meno: ${userProfile.name}
- Cieľ: ${userProfile.goal}
- Aktuálna váha: ${latestWeight} kg
- Cieľová váha: ~${goalWeight.toFixed(1)} kg
- Aktivita: ${userProfile.activity}
- Vek: ${userProfile.age} rokov
- Výška: ${userProfile.height} cm

Zmena váhy: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg

Poskytni:
1. Krátku motivujúcu spätnú väzbu (2-3 vety)
2. Odporúčaný denný príjem kalórií
3. 2-3 konkrétne tipy na dosiahnutie cieľa

Odpovedaj v slovenčine, buď pozitívny a podnetný.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Daj mi analýzu môjho progresu a odporúčania.' }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Príliš veľa požiadaviek. Skúste neskôr.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Nedostatok kreditov. Kontaktujte podporu.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in health-assistant function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
