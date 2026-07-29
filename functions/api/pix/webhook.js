// Cloudflare Pages Function — /api/pix/webhook
// Convertido de netlify/functions/pix-webhook.js
// Recebe notificacoes da IronPay e responde 200 para evitar reenvios.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response("", { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const notification = await request.json();
    console.log(JSON.stringify({
      event: "IRONPAY_WEBHOOK_RECEIVED",
      transaction_hash: notification.transaction_hash || null,
      status: notification.status || null,
      amount: notification.amount || null,
    }));
  } catch {
    // corpo invalido — responde 200 mesmo assim para nao gerar retentativas
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
}
