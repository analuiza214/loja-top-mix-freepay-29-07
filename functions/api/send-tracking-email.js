// Cloudflare Pages Function — /api/send-tracking-email
// Convertido de netlify/functions/send-tracking-email.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders });

  const RESEND_API_KEY   = env.RESEND_API_KEY;
  const RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL;

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY nao configurado nas variaveis de ambiente do Cloudflare" }), { status: 500, headers: corsHeaders });
  }
  if (!RESEND_FROM_EMAIL) {
    return new Response(JSON.stringify({ error: "RESEND_FROM_EMAIL nao configurado. Configure nas variaveis de ambiente do Cloudflare com um email do seu dominio verificado na Resend." }), { status: 500, headers: corsHeaders });
  }

  let payload;
  try { payload = await request.json(); }
  catch { return new Response(JSON.stringify({ error: "JSON invalido" }), { status: 400, headers: corsHeaders }); }

  const { emailCliente, nomeCliente, codigoRastreio, numeroPedido } = payload;

  if (!emailCliente || !codigoRastreio) {
    return new Response(JSON.stringify({ error: "emailCliente e codigoRastreio sao obrigatorios" }), { status: 400, headers: corsHeaders });
  }

  const primeiroNome = nomeCliente ? nomeCliente.split(" ")[0] : "cliente";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Código de Rastreio — TopMix Brasil</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#15803d;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">📦 TopMix Brasil</p>
              <p style="margin:6px 0 0;font-size:13px;color:#bbf7d0;">Seu pedido está a caminho!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>${primeiroNome}</strong>! 👋</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                ${numeroPedido ? `Seu pedido <strong>#${numeroPedido}</strong> foi confirmado e já está sendo preparado para envio.` : "Seu pedido foi confirmado e já está sendo preparado para envio."}
                Use o código abaixo para acompanhar a entrega:
              </p>
              <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:1px;">Código de Rastreio</p>
                <p style="margin:0;font-size:28px;font-weight:900;color:#15803d;letter-spacing:4px;font-family:monospace;">${codigoRastreio}</p>
              </div>
              <div style="text-align:center;margin:0 0 24px;">
                <a href="https://toop-mix-oficial.shop/rastrear-pedido"
                   style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;">
                  Rastrear meu pedido →
                </a>
              </div>
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
                Dúvidas? Entre em contato conosco pelo WhatsApp.<br/>
                Obrigado por comprar na <strong>TopMix Brasil</strong>! 🌟
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;color:#d1d5db;">
                © ${new Date().getFullYear()} TopMix Brasil · Este email foi enviado automaticamente.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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
        subject: `📦 Seu código de rastreio TopMix${numeroPedido ? ` — Pedido #${numeroPedido}` : ""}`,
        html,
      }),
    });

    const result = await res.json();

    if (res.ok) {
      return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 200, headers: corsHeaders });
    }

    const msg = result.message || result.error || JSON.stringify(result);
    return new Response(JSON.stringify({ error: `Resend erro ${res.status}: ${msg}` }), { status: 502, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: corsHeaders });
  }
}
