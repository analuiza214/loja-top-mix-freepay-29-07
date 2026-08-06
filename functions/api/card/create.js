// Cloudflare Pages Function — /api/card/create
// Gateway: FreePay Brasil — Pagamento com Cartão de Crédito
// Autenticação: Basic Auth — btoa(FREEPAY_PUBLIC_KEY:FREEPAY_SECRET_KEY)

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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // ── Credenciais FreePay ──────────────────────────────────────────────────────
  const publicKey = env.FREEPAY_PUBLIC_KEY;
  const secretKey = env.FREEPAY_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return new Response(
      JSON.stringify({ error: "Gateway de pagamento não configurado." }),
      { status: 500, headers: corsHeaders }
    );
  }

  const authToken = btoa(`${publicKey}:${secretKey}`);

  // ── Parse do body ────────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido." }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const {
    amount,
    name,
    email,
    phone,
    document,
    productName,
    card,        // { number, holderName, expiryMonth, expiryYear, cvv, cpf }
    installments,
  } = body;

  if (!amount || !name || !card?.number) {
    return new Response(
      JSON.stringify({ error: "Campos obrigatórios: amount, name, card." }),
      { status: 400, headers: corsHeaders }
    );
  }

  // ── CPF ──────────────────────────────────────────────────────────────────────
  // Prioridade: CPF do cartão (digitado pelo cliente) > document > gerado
  const cpfRaw = card.cpf || (document ? String(document).replace(/\D/g, "") : "");
  const cpfFinal = cpfRaw.length === 11 ? cpfRaw : gerarCpfAleatorio();

  // ── Telefone ─────────────────────────────────────────────────────────────────
  const phoneFinal = phone ? String(phone).replace(/\D/g, "") : "11999999999";

  // ── Valor em centavos ────────────────────────────────────────────────────────
  const amountInCents = Math.round(Number(amount) * 100);

  // ── Parcelas ─────────────────────────────────────────────────────────────────
  const numParcelas = Math.max(1, Math.min(12, parseInt(String(installments || 1), 10)));

  // ── Webhook URL ──────────────────────────────────────────────────────────────
  const siteUrl = (env.SITE_URL || "").trim().replace(/\/+$/, "");
  const webhookUrl = siteUrl ? `${siteUrl}/api/pix/webhook` : undefined;

  // ── Validade do cartão ───────────────────────────────────────────────────────
  // Aceita "MM" e "YYYY" ou "YY"
  const expMonth = String(card.expiryMonth || "").padStart(2, "0");
  const expYearRaw = String(card.expiryYear || "");
  const expYear = expYearRaw.length === 2 ? `20${expYearRaw}` : expYearRaw;

  // ── Número do cartão — remove espaços ────────────────────────────────────────
  const cardNumber = String(card.number || "").replace(/\s/g, "");

  // ── Payload FreePay — cartão de crédito ──────────────────────────────────────
  const payload = {
    amount: amountInCents,
    payment_method: "credit_card",
    installments: numParcelas,
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
    card: {
      holder_name: String(card.holderName || name),
      number: cardNumber,
      expiration_month: expMonth,
      expiration_year: expYear,
      cvv: String(card.cvv || ""),
    },
    metadata: {
      source: "topmix",
      customer_name: String(name),
      ...(body.address ? {
        zip_code: body.address.zipCode || "",
        city: body.address.city || "",
        state: body.address.state || "",
      } : {}),
    },
  };

  // ── Chamada à API FreePay ─────────────────────────────────────────────────────
  try {
    const res = await fetch(
      "https://api.freepaybrasil.com/v1/payment-transaction/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    // ── Loga resposta completa da FreePay (visível nos Cloudflare Logs) ────────
    console.log(JSON.stringify({
      event: "FREEPAY_CARD_RAW_RESPONSE",
      httpStatus: res.status,
      success: data.success,
      data: data,
      payloadSent: payload,
    }));

    // ── Trata erros da API ────────────────────────────────────────────────────
    if (!res.ok || !data.success) {
      const errMsg =
        data.error_messages && data.error_messages.length > 0
          ? data.error_messages.map((e) => e.message || e).join("; ")
          : (data.message || data.error || "Erro ao processar cartão. Tente novamente.");

      // Status 4xx com data.success=false normalmente = cartão recusado
      const isDeclined =
        res.status === 400 ||
        res.status === 422 ||
        (data.data && ["REFUSED", "FAILED", "ERROR"].includes(
          (data.data.status || "").toUpperCase()
        ));

      return new Response(
        JSON.stringify({
          status: isDeclined ? "declined" : "error",
          error: errMsg,
          freepay_raw: data,           // resposta bruta para debug no browser
          freepay_http_status: res.status,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Extrai dados da transação ─────────────────────────────────────────────
    const txData = data.data || {};
    const transactionId = txData.id;

    if (!transactionId) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Resposta inválida do gateway: id ausente.",
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // FreePay retorna status em maiúsculas: PAID, PENDING, REFUSED, FAILED
    const rawStatus = (txData.status || "PENDING").toUpperCase();

    // Mapeia para os status internos do site
    let internalStatus;
    if (rawStatus === "PAID" || rawStatus === "APPROVED") {
      internalStatus = "approved";
    } else if (["REFUSED", "FAILED", "ERROR", "EXPIRED"].includes(rawStatus)) {
      internalStatus = "declined";
    } else {
      // PENDING — raro para cartão, mas tratamos como aprovado pendente
      internalStatus = "pending";
    }

    console.log(
      JSON.stringify({
        event: "FREEPAY_CARD_TRANSACTION",
        transactionId,
        rawStatus,
        internalStatus,
        amount: amountInCents,
        installments: numParcelas,
      })
    );

    return new Response(
      JSON.stringify({
        transactionId,
        status: internalStatus,
        rawStatus,
        amount: amountInCents,
        installments: numParcelas,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", error: "Erro de comunicação com o gateway." }),
      { status: 200, headers: corsHeaders }
    );
  }
}
