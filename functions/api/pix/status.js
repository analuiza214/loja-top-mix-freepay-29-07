// Cloudflare Pages Function — /api/pix/status
// Convertido de netlify/functions/pix-status.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response("", { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const url = new URL(request.url);
  // Suporte a ambos os parametros: transactionId e id
  const transactionId = url.searchParams.get("transactionId") || url.searchParams.get("id");

  if (!transactionId) {
    return new Response(JSON.stringify({ error: "transactionId obrigatorio" }), { status: 400, headers: corsHeaders });
  }

  const apiToken = env.IRONPAY_API_TOKEN;

  if (!apiToken) {
    return new Response(JSON.stringify({ error: "Gateway nao configurado" }), { status: 500, headers: corsHeaders });
  }

  try {
    const res = await fetch(
      `https://api.ironpayapp.com.br/api/public/v1/transactions/${encodeURIComponent(transactionId)}?api_token=${encodeURIComponent(apiToken)}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Erro ao consultar gateway.", details: data }), { status: 502, headers: corsHeaders });
    }

    const rawStatus = (data.payment_status || data.status || "").toUpperCase();
    const isPaid    = rawStatus === "PAID";
    const isExpired = rawStatus === "CANCELED" || rawStatus === "REFUNDED";

    return new Response(
      JSON.stringify({ transactionId, status: rawStatus.toLowerCase(), isPaid, isExpired, payedAt: data.paid_at || null }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro ao consultar status do pagamento." }), { status: 502, headers: corsHeaders });
  }
}
