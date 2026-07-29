// Cloudflare Pages Function — /api/fb-purchase
// Convertido de netlify/functions/fb-purchase.js
// Usa Web Crypto API (disponivel globalmente no Cloudflare Workers)

async function hash(str) {
  if (!str) return undefined;
  const data = new TextEncoder().encode(String(str).trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders });

  const FB_PIXEL_ID      = env.FB_PIXEL_ID;
  const FB_ACCESS_TOKEN  = env.FB_ACCESS_TOKEN;

  if (!FB_PIXEL_ID || !FB_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "Pixel nao configurado" }), { status: 500, headers: corsHeaders });
  }

  let payload;
  try { payload = await request.json(); }
  catch { return new Response(JSON.stringify({ error: "JSON invalido" }), { status: 400, headers: corsHeaders }); }

  const { user_data, custom_data } = payload;

  const fbPayload = {
    data: [{
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      user_data: {
        em: user_data?.em?.[0] ? [await hash(user_data.em[0])] : undefined,
        ph: user_data?.ph?.[0] ? [await hash(user_data.ph[0])] : undefined,
        fn: user_data?.fn?.[0] ? [await hash(user_data.fn[0])] : undefined,
        ln: user_data?.ln?.[0] ? [await hash(user_data.ln[0])] : undefined,
        fbc: user_data?.fbc || undefined,
        fbp: user_data?.fbp || undefined,
      },
      custom_data: custom_data || {},
    }],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fbPayload),
      }
    );

    const result = await res.text();
    console.log("FB CAPI response:", res.status, result);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
