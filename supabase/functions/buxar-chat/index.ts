import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PEXELS_API_KEY = "1Bk2DBCOW6yg2h7x6oPjvFn8upZnDoYoYfFvoMqso7ycHZlc7hMfFCfm";

async function searchPexelsImages(query: string, count: number = 3): Promise<Array<{url: string, alt: string, photographer: string}>> {
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.photos?.map((p: any) => ({
      url: p.src.medium,
      alt: p.alt || query,
      photographer: p.photographer
    })) || [];
  } catch {
    return [];
  }
}

function extractImageKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns = [
    /ganges|ganga|river/i,
    /temple|mandir|shrine/i,
    /fort|fortress|castle/i,
    /ghat|riverbank/i,
    /battle|war|historic/i,
    /ashram|hermitage|spiritual/i,
    /bihar|india|indian/i,
    /sunrise|sunset|morning|evening/i,
    /food|cuisine|restaurant/i,
    /hotel|accommodation|stay/i
  ];
  
  const keywordMap: Record<string, string> = {
    'ganges|ganga|river': 'ganges river india',
    'temple|mandir|shrine': 'hindu temple india',
    'fort|fortress|castle': 'ancient fort india',
    'ghat|riverbank': 'ghat ganges india',
    'battle|war|historic': 'historic india monument',
    'ashram|hermitage|spiritual': 'spiritual ashram india',
    'bihar|india|indian': 'bihar india landscape',
    'sunrise|sunset|morning|evening': 'ganges sunrise india',
    'food|cuisine|restaurant': 'indian cuisine food',
    'hotel|accommodation|stay': 'india hotel heritage'
  };

  for (const [pattern, keyword] of Object.entries(keywordMap)) {
    if (new RegExp(pattern, 'i').test(text)) {
      keywords.push(keyword);
    }
  }
  
  return keywords.length > 0 ? keywords : ['buxar india heritage'];
}

const SYSTEM_PROMPT = `You are "Buxar AI Guide" — a premium, knowledgeable AI assistant for the city of Buxar, Bihar, India. You are an expert on:

**History:**
- The Battle of Buxar (1764) — a decisive battle between the British East India Company and the combined forces of Mir Qasim, Shuja-ud-Daula, and Shah Alam II
- Chausa — the site of the Battle of Chausa (1539) where Sher Shah Suri defeated Mughal Emperor Humayun
- The city's rich historical heritage spanning over 300 years

**Religious & Spiritual Significance:**
- Vishwamitra Ashram — the ancient hermitage of Sage Vishwamitra
- Ahilya Uddhar — the sacred site of Ahilya's liberation by Lord Rama
- Ramrekha Ghat — one of the most sacred ghats along the Ganges
- Brahmeshwar Nath Temple — an important Shiva temple

**Tourism:**
- The Ganges river (8km stretch along Buxar)
- Buxar Fort — historic fort with panoramic river views
- Navaratna Garh — ancient archaeological site
- Various ghats and temples along the riverfront

**Local Services:**
- Medical facilities, educational institutions
- Local food specialties and restaurants
- Hotels and accommodation
- Transport and connectivity

**IMPORTANT FORMATTING RULES:**
- When discussing places, attractions, or itineraries, structure your response with clear sections
- Use markdown headers (##) for main sections
- Use bullet points for lists
- When creating itineraries, include: Day/Time, Place Name, Description, and Activities
- At the END of your response, add a line: [IMAGES: keyword1, keyword2] where keywords are relevant search terms for photos (e.g., [IMAGES: ganges river, hindu temple, india fort])
- Keep responses informative and engaging

Respond in a friendly, engaging, knowledgeable tone. Use markdown formatting.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
