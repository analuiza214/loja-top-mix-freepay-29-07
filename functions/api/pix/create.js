// Cloudflare Pages Function — /api/pix/create
// Convertido de netlify/functions/pix-create.js

function gerarCpfAleatorio() {
  const rand = () => Math.floor(Math.random() * 9);
  const d = Array.from({ length: 9 }, rand);
  let sum = d.reduce((acc, v, i) => acc + v * (10 - i), 0);
  d.push(((sum * 10) % 11) % 10);
  sum = d.reduce((acc, v, i) => acc + v * (11 - i), 0);
  d.push(((sum * 10) % 11) % 10);
  return d.join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response("", { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const apiToken    = env.IRONPAY_API_TOKEN;
  const offerHash   = env.IRONPAY_OFFER_HASH;
  const productHash = env.IRONPAY_PRODUCT_HASH;

  if (!apiToken || !offerHash || !productHash) {
    return new Response(JSON.stringify({ error: "Gateway de pagamento nao configurado." }), { status: 500, headers: corsHeaders });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON invalido." }), { status: 400, headers: corsHeaders });
  }

  const { amount, name, document, productName, email, phone } = body;

  if (!amount || !name) {
    return new Response(JSON.stringify({ error: "Campos obrigatorios: amount, name." }), { status: 400, headers: corsHeaders });
  }

  const cpfDigits = document ? String(document).replace(/\D/g, "") : "";
  const payerDocument = cpfDigits.length === 11 ? cpfDigits : gerarCpfAleatorio();

  // Em Cloudflare Pages, use a variavel SITE_URL configurada no painel
  const siteUrl = env.SITE_URL || "";
  const webhookUrl = siteUrl ? `${siteUrl}/api/pix/webhook` : undefined;

  const amountInCents = Math.round(Number(amount) * 100);

  const payload = {
    amount: amountInCents,
    offer_hash: offerHash,
    payment_method: "pix",
    customer: {
      name: String(name),
      email: email ? String(email) : "cliente@email.com",
      phone_number: phone ? String(phone).replace(/\D/g, "") || "00000000000" : "00000000000",
      document: payerDocument,
    },
    cart: [
      {
        product_hash: productHash,
        title: productName || "Kit Album Copa Do Mundo 2026 Capa Mole + 250 Figurinhas Panini",
        cover: null,
        price: amountInCents,
        quantity: 1,
        operation_type: 1,
        tangible: true,
      },
    ],
    expire_in_days: 1,
    transaction_origin: "api",
    ...(webhookUrl ? { postback_url: webhookUrl } : {}),
  };

  try {
    const res = await fetch(
      `https://api.ironpayapp.com.br/api/public/v1/transactions?api_token=${encodeURIComponent(apiToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Erro ao gerar PIX. Tente novamente.", details: data }), { status: 502, headers: corsHeaders });
    }

    const transactionId = data.hash || data.transaction_hash;

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "Resposta invalida do gateway: hash ausente.", rawResponse: data }), { status: 502, headers: corsHeaders });
    }

    const pix = data.pix || {};
    const pixCode = pix.pix_qr_code || pix.qr_code || pix.code || pix.copy_paste || null;
    const qrCodeBase64 = pix.qr_code_base64 || pix.base64 || null;
    const qrCodeImage = pixCode
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`
      : pix.pix_url || null;

    if (!pixCode) {
      return new Response(JSON.stringify({ error: "QR Code PIX nao gerado.", rawResponse: data }), { status: 502, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ transactionId, status: data.payment_status || "PENDENTE", pixCode, qrCodeBase64: qrCodeBase64 || null, qrCodeImage: qrCodeImage || null }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro de comunicacao com o gateway." }), { status: 502, headers: corsHeaders });
  }
}
