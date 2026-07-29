// Cloudflare Pages Function — /api/pix/webhook
// Gateway: FreePay Brasil
//
// FreePay envia notificações no formato PascalCase:
// {
//   "Id": "...",
//   "Status": "PENDING|PAID|REFUNDED|REFUSED|EXPIRED|ERROR|...",
//   "Amount": 100,  // em reais
//   "PaymentMethod": "pix",
//   "ExternalId": "...",
//   "PaidAt": "...",
//   "UpdatedAt": "...",
//   "PostbackUrl": "..."
// }

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
      event: "FREEPAY_WEBHOOK_RECEIVED",
      transaction_id: notification.Id || null,
      status: notification.Status || null,
      amount: notification.Amount || null,
      payment_method: notification.PaymentMethod || null,
      paid_at: notification.PaidAt || null,
    }));
  } catch {
    // corpo inválido — responde 200 mesmo assim para não gerar retentativas
  }

  // FreePay aguarda HTTP 200 para confirmar recebimento
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
}
