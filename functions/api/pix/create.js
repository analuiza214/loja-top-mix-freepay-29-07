// Cloudflare Pages Function — /api/pix/create
// Gateway: FreePay Brasil (https://api.freepaybrasil.com)
// Testado e validado: autenticação Basic btoa(PUBLIC_KEY:SECRET_KEY)

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

  const publicKey = env.FREEPAY_PUBLIC_KEY;
  const secretKey = env.FREEPAY_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return new Response(JSON.stringify({ error: "Gateway de pagamento não configurado." }), { status: 500, headers: corsHeaders });
  }

  // Basic Auth: btoa(PUBLIC_KEY:SECRET_KEY)
  const authToken = btoa(`${publicKey}:${secretKey}`);

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido." }), { status: 400, headers: corsHeaders });
  }

  const { amount, name, email, phone, document, productName, address } = body;

  if (!amount || !name) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios: amount, name." }), { status: 400, headers: corsHeaders });
  }

  // CPF: usa o informado se válido (11 dígitos), senão gera aleatório
  const cpfDigits = document ? String(document).replace(/\D/g, "") : "";
  const cpfFinal = cpfDigits.length === 11 ? cpfDigits : gerarCpfAleatorio();

  // Telefone: remove formatação, mantém apenas dígitos
  const phoneFinal = phone ? String(phone).replace(/\D/g, "") : "11999999999";

  // Valor em centavos (FreePay recebe em centavos)
  const amountInCents = Math.round(Number(amount) * 100);

  // URL de webhook (configurada via env SITE_URL)
  const siteUrl = (env.SITE_URL || "").trim().replace(/\/+$/, "");
  const webhookUrl = siteUrl ? `${siteUrl}/api/pix/webhook` : undefined;

  const payload = {
    amount: amountInCents,
    payment_method: "pix",
    ...(webhookUrl ? { postback_url: webhookUrl } : {}),
    customer: {
      name: String(name),
      email: email ? String(email) : "cliente@email.com",
      document: {
        type: "cpf",
        number: cpfFinal,
      },
      phone: phoneFinal,
    },
    items: [
      {
        title: productName || "Kit Figurinhas Copa do Mundo 2026",
        unit_price: amountInCents,
        quantity: 1,
        tangible: true,
      },
    ],
    metadata: {
      source: "topmix",
      customer_name: String(name),
      ...(address ? {
        zip_code: address.zipCode || "",
        city: address.city || "",
        state: address.state || "",
      } : {}),
    },
  };

  try {
    const res = await fetch("https://api.freepaybrasil.com/v1/payment-transaction/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errMsg = (data.error_messages && data.error_messages.length > 0)
        ? data.error_messages.map(e => e.message || e).join("; ")
        : "Erro ao gerar PIX. Tente novamente.";
      return new Response(JSON.stringify({ error: errMsg, details: data }), { status: 502, headers: corsHeaders });
    }

    const txData = data.data || {};
    const transactionId = txData.id;

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "Resposta inválida do gateway: id ausente.", rawResponse: data }), { status: 502, headers: corsHeaders });
    }

    const pixData = txData.pix || {};
    const pixCode = pixData.qr_code || null;

    if (!pixCode) {
      return new Response(JSON.stringify({ error: "QR Code PIX não gerado.", rawResponse: data }), { status: 502, headers: corsHeaders });
    }

    // Gera imagem do QR code via qrserver.com (FreePay não retorna base64)
    const qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;

    return new Response(
      JSON.stringify({
        transactionId,
        status: (txData.status || "PENDING").toLowerCase(),
        pixCode,
        qrCodeBase64: null,
        qrCodeImage,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro de comunicação com o gateway." }), { status: 502, headers: corsHeaders });
  }
}
