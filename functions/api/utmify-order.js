// Cloudflare Pages Function — /api/utmify-order
// Convertido de netlify/functions/utmify-order.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders });

  const UTMIFY_API_TOKEN = env.UTMIFY_API_TOKEN;
  if (!UTMIFY_API_TOKEN) {
    return new Response(JSON.stringify({ error: "UTMIFY_API_TOKEN nao configurado" }), { status: 500, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: "JSON invalido" }), { status: 400, headers: corsHeaders }); }

  const {
    orderId,
    status,
    customerName,
    customerEmail,
    customerPhone,
    customerDocument,
    productName,
    valueInCents,
    tracking,
  } = body;

  const now = new Date().toISOString();

  const utmifyPayload = {
    orderId: orderId || `topmix_${Date.now()}`,
    platform: "other",
    paymentMethod: "pix",
    status: status || "paid",
    createdAt: now,
    approvedDate: status === "paid" ? now : null,
    refundedAt: null,
    customer: {
      name: customerName || "Cliente",
      email: customerEmail || "sem-email@topmix.com",
      phone: customerPhone || null,
      document: customerDocument || null,
      country: "BR",
    },
    products: [
      {
        id: "topmix_kit",
        name: productName || "Kit Album Copa Do Mundo 2026",
        planId: "topmix_kit",
        planName: productName || "Kit Album Copa Do Mundo 2026",
        quantity: 1,
        priceInCents: valueInCents || 0,
      },
    ],
    trackingParameters: {
      src: null,
      sck: null,
      utm_source: tracking?.utm_source || null,
      utm_campaign: tracking?.utm_campaign || null,
      utm_medium: tracking?.utm_medium || null,
      utm_content: tracking?.utm_content || null,
      utm_term: tracking?.utm_term || null,
    },
    commission: {
      totalPriceInCents: valueInCents || 0,
      gatewayFeeInCents: 0,
      userCommissionInCents: valueInCents || 0,
    },
    isTest: false,
  };

  try {
    const res = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": UTMIFY_API_TOKEN,
      },
      body: JSON.stringify(utmifyPayload),
    });

    const result = await res.json();
    console.log("[utmify-order] Resposta:", res.status, JSON.stringify(result));

    return new Response(JSON.stringify({ ok: true, utmifyStatus: res.status }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
