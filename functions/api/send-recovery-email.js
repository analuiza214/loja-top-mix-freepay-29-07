// Cloudflare Pages Function — /api/send-recovery-email
// Convertido de netlify/functions/send-recovery-email.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function buildEmail1(primeiroNome, localidade, cidadeFormatada, produtos, valorFormatado, ctaLabel, storeUrl, status) {
  const introducao = status === "pix_gerado"
    ? "Seu PIX foi gerado, mas o pagamento ainda não caiu. Seu pedido continua reservado — mas só por pouco tempo."
    : "Você quase finalizou. Seu pedido ainda está guardado aqui pra você.";

  const desejoComCidade = cidadeFormatada
    ? `Confirme agora e suas figurinhas saem daqui direto pra <strong>${cidadeFormatada}</strong> — entrega garantida em <strong>até 2 dias úteis</strong>, com rastreio do começo ao fim.`
    : `Confirme agora e suas figurinhas chegam onde você está — entrega garantida em <strong>até 2 dias úteis</strong>, com rastreio do começo ao fim.`;

  return `
    <p style="margin:0 0 16px;font-size:15px;color:#111827;font-weight:700;">Oi, ${primeiroNome}! 👋</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">${introducao}</p>
    ${localidade ? `
    <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">🚚 Entrega garantida para você</p>
      <p style="margin:0;font-size:20px;font-weight:900;color:#111827;line-height:1.3;">${cidadeFormatada} em até 2 dias úteis</p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Frete 100% grátis · Rastreio em tempo real · Embalagem reforçada</p>
    </div>` : `
    <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">🚚 Entrega garantida onde você estiver</p>
      <p style="margin:0;font-size:20px;font-weight:900;color:#111827;line-height:1.3;">Chega em até 2 dias úteis</p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Frete 100% grátis · Rastreio em tempo real · Embalagem reforçada</p>
    </div>`}
    ${produtos ? `
    <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Seu pedido reservado:</p>
    <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
      <p style="margin:0;font-size:13px;color:#374151;font-weight:600;">${produtos}</p>
      ${valorFormatado ? `<p style="margin:4px 0 0;font-size:15px;color:#15803d;font-weight:900;">${valorFormatado}</p>` : ""}
    </div>` : ""}
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">${desejoComCidade}</p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${storeUrl}?utm_source=recovery&utm_medium=email&utm_campaign=email1"
         style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:900;font-size:16px;padding:18px 40px;border-radius:12px;">
        ${ctaLabel}
      </a>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 20px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:700;">⏳ Estoque limitado — kits esgotam rápido.</p>
    </div>
  `;
}

function buildEmail2(primeiroNome, localidade, cidadeFormatada, produtos, valorFormatado, ctaLabel, storeUrl) {
  return `
    <p style="margin:0 0 16px;font-size:15px;color:#111827;font-weight:700;">${primeiroNome}, ainda dá tempo! 🏆</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Desde que você visitou a loja, <strong>dezenas de clientes já garantiram o kit</strong> e estão esperando as figurinhas chegarem na porta.
    </p>
    <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;">✅ Seu pedido ainda está aqui</p>
      <p style="margin:0;font-size:18px;font-weight:900;color:#111827;line-height:1.3;">
        ${localidade ? `Entrega garantida em ${cidadeFormatada}` : "Entrega garantida para você"}
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">🚚 Chega em até 2 dias úteis · Frete grátis</p>
    </div>
    ${produtos ? `
    <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Seu kit reservado</p>
      <p style="margin:0;font-size:13px;color:#374151;font-weight:600;">${produtos}</p>
      ${valorFormatado ? `<p style="margin:4px 0 0;font-size:15px;color:#15803d;font-weight:900;">${valorFormatado}</p>` : ""}
    </div>` : ""}
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      Não deixe seu kit ir para outra pessoa. ${localidade ? `Em ${cidadeFormatada}, a entrega é garantida em <strong>até 2 dias úteis</strong>.` : "A entrega é garantida em <strong>até 2 dias úteis</strong>."}
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${storeUrl}?utm_source=recovery&utm_medium=email&utm_campaign=email2"
         style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:900;font-size:16px;padding:18px 40px;border-radius:12px;">
        ${ctaLabel}
      </a>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 20px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:700;">🔥 O estoque está acabando — muita gente finalizou hoje.</p>
    </div>
  `;
}

function buildEmail3(primeiroNome, localidade, cidadeFormatada, produtos, valorFormatado, ctaLabel, storeUrl) {
  return `
    <p style="margin:0 0 16px;font-size:15px;color:#111827;font-weight:700;">${primeiroNome}, este é o último aviso. ⚠️</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Seu pedido ficou reservado por horas — mas o estoque está chegando ao limite. <strong>Depois disso, não podemos mais garantir o seu kit.</strong>
    </p>
    <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">⚡ Última chance de garantir</p>
      <p style="margin:0;font-size:18px;font-weight:900;color:#111827;line-height:1.3;">
        ${localidade ? `Figurinhas em ${cidadeFormatada} em 2 dias` : "Figurinhas na sua porta em 2 dias"}
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Frete grátis · Entrega garantida · Rastreio incluso</p>
    </div>
    ${produtos ? `
    <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Kit reservado para você</p>
      <p style="margin:0;font-size:13px;color:#374151;font-weight:600;">${produtos}</p>
      ${valorFormatado ? `<p style="margin:4px 0 0;font-size:15px;color:#15803d;font-weight:900;">${valorFormatado}</p>` : ""}
    </div>` : ""}
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      Se não finalizar agora, seu pedido será cancelado e o kit vai para a fila de espera de outros clientes.
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${storeUrl}?utm_source=recovery&utm_medium=email&utm_campaign=email3"
         style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:900;font-size:16px;padding:18px 40px;border-radius:12px;">
        ${ctaLabel}
      </a>
    </div>
  `;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders });

  const RESEND_API_KEY    = env.RESEND_API_KEY;
  const RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL;

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY nao configurado" }), { status: 500, headers: corsHeaders });
  }
  if (!RESEND_FROM_EMAIL) {
    return new Response(JSON.stringify({ error: "RESEND_FROM_EMAIL nao configurado" }), { status: 500, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: "JSON invalido" }), { status: 400, headers: corsHeaders }); }

  const {
    emailCliente,
    nomeCliente,
    cidade,
    estado,
    produtos,
    valor,
    emailNum,
    status,
    storeUrl,
  } = body;

  if (!emailCliente) {
    return new Response(JSON.stringify({ error: "emailCliente obrigatorio" }), { status: 400, headers: corsHeaders });
  }

  const num = Number(emailNum) || 1;
  const primeiroNome = nomeCliente ? nomeCliente.split(" ")[0] : "cliente";
  const cidadeFormatada = cidade
    ? `${cidade.charAt(0).toUpperCase() + cidade.slice(1).toLowerCase()}${estado ? `/${estado.toUpperCase()}` : ""}`
    : null;
  const localidade = !!cidadeFormatada;
  const valorFormatado = valor
    ? `R$ ${(Number(valor) / 100).toFixed(2).replace(".", ",")}`
    : null;
  const ctaLabel = "✅ Garantir meu kit agora →";
  const url = storeUrl || env.SITE_URL || "https://toop-mix-oficial.shop/";

  let corpoHtml;
  let assunto;

  if (num >= 3) {
    assunto = `⚠️ ${primeiroNome}, último aviso — seu kit vai para outra pessoa`;
    corpoHtml = buildEmail3(primeiroNome, localidade, cidadeFormatada, produtos, valorFormatado, ctaLabel, url);
  } else if (num === 2) {
    assunto = cidadeFormatada
      ? `🏆 ${primeiroNome}, outros já garantiram — seu kit ainda está aqui em ${cidadeFormatada}`
      : `🏆 ${primeiroNome}, outros já garantiram — seu kit ainda está aqui`;
    corpoHtml = buildEmail2(primeiroNome, localidade, cidadeFormatada, produtos, valorFormatado, ctaLabel, url);
  } else {
    assunto = cidadeFormatada
      ? `⚽ ${primeiroNome}, falta 1 minuto — suas figurinhas chegam em 2 dias em ${cidadeFormatada}!`
      : `⚽ ${primeiroNome}, suas figurinhas chegam em 2 dias — garanta agora!`;
    corpoHtml = buildEmail1(primeiroNome, localidade, cidadeFormatada, produtos, valorFormatado, ctaLabel, url, status);
  }

  const headerSubtitles = {
    1: cidadeFormatada ? `Suas figurinhas chegam em ${cidadeFormatada} em 2 dias. ⚡` : "Entrega em 2 dias, garantida. Só falta 1 clique. ⚡",
    2: "Outros clientes já garantiram. Você ainda pode. 🏆",
    3: "Último aviso — seu kit vai para outra pessoa. ⚠️",
  };
  const headerSubtitle = headerSubtitles[num] || headerSubtitles[1];

  const garantiasHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr>
        <td style="padding:6px 8px 6px 0;font-size:12px;color:#6b7280;">✅ <strong>Figurinhas 100% originais</strong> Panini</td>
        <td style="padding:6px 0 6px 8px;font-size:12px;color:#6b7280;">🔒 Pagamento 100% seguro</td>
      </tr>
      <tr>
        <td style="padding:6px 8px 6px 0;font-size:12px;color:#6b7280;">📦 Embalagem reforçada anti-amassado</td>
        <td style="padding:6px 0 6px 8px;font-size:12px;color:#6b7280;">🚚 Rastreio em tempo real</td>
      </tr>
    </table>
  `;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TopMix Brasil</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#dc2626;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">⚽ TopMix Brasil</p>
            <p style="margin:6px 0 0;font-size:14px;color:#fecaca;font-weight:700;">${headerSubtitle}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${corpoHtml}
            ${garantiasHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Dúvidas? Chame no WhatsApp. Somos sempre rápidos! 😊</p>
            <p style="margin:0;font-size:11px;color:#d1d5db;">
              © ${new Date().getFullYear()} TopMix Brasil · Você recebeu este email pois iniciou um pedido em nossa loja.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [emailCliente],
        subject: assunto,
        html,
      }),
    });

    const result = await res.json();
    console.log(`[send-recovery-email] email #${num} → Status Resend:`, res.status);

    if (res.ok) {
      return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 200, headers: corsHeaders });
    }

    const msg = result.message || result.error || JSON.stringify(result);
    return new Response(JSON.stringify({ error: `Resend erro ${res.status}: ${msg}` }), { status: 502, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: corsHeaders });
  }
}
