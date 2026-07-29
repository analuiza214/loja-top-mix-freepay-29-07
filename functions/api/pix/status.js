// Cloudflare Pages Function — /api/pix/status
// Gateway: FreePay Brasil
// GET /api/pix/status?transactionId=<id>

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
  const transactionId = url.searchParams.get("transactionId") || url.searchParams.get("id");

  if (!transactionId) {
    return new Response(JSON.stringify({ error: "transactionId obrigatório" }), { status: 400, headers: corsHeaders });
  }

  const publicKey = env.FREEPAY_PUBLIC_KEY;
  const secretKey = env.FREEPAY_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return new Response(JSON.stringify({ error: "Gateway não configurado" }), { status: 500, headers: corsHeaders });
  }

  const authToken = btoa(`${publicKey}:${secretKey}`);

  try {
    const res = await fetch(
      `https://api.freepaybrasil.com/v1/payment-transaction/info/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Erro ao consultar gateway.", details: data }), { status: 502, headers: corsHeaders });
    }

    // A resposta pode vir diretamente ou dentro de data.data
    const txData = data.data || data;

    const rawStatus = (txData.status || "PENDING").toUpperCase();
    const isPaid = rawStatus === "PAID";
    const isExpired = ["EXPIRED", "REFUSED", "FAILED", "REFUNDED", "ERROR"].includes(rawStatus);

    return new Response(
      JSON.stringify({
        transactionId,
        status: rawStatus.toLowerCase(),
        isPaid,
        isExpired,
        payedAt: txData.paid_at || null,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro ao consultar status do pagamento." }), { status: 502, headers: corsHeaders });
  }
}
