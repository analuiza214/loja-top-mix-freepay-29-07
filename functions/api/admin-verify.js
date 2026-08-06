// Cloudflare Pages Function — /api/admin-verify
// Verifica se o token de sessão emitido por /api/admin-login é válido.
// Chamado pelo frontend a cada carregamento do painel admin.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

/** Recalcula a assinatura HMAC-SHA256 do payload */
async function hmacSign(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante */
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response("", { status: 204, headers: CORS });
  }

  const ADMIN_SESSION_SECRET = env.ADMIN_SESSION_SECRET;
  if (!ADMIN_SESSION_SECRET) {
    return new Response(
      JSON.stringify({ valid: false, error: "Servidor não configurado." }),
      { status: 500, headers: CORS }
    );
  }

  // Lê token do header Authorization: Bearer <token>
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!token) {
    return new Response(
      JSON.stringify({ valid: false }),
      { status: 401, headers: CORS }
    );
  }

  // Formato do token: base64(payload).hexHmac
  const dot = token.lastIndexOf(".");
  if (dot === -1) {
    return new Response(
      JSON.stringify({ valid: false }),
      { status: 401, headers: CORS }
    );
  }

  const payloadB64 = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  // Recalcula assinatura esperada
  const expectedSig = await hmacSign(payloadB64, ADMIN_SESSION_SECRET);

  // Verifica assinatura
  if (!timingSafeEqual(expectedSig, providedSig)) {
    return new Response(
      JSON.stringify({ valid: false }),
      { status: 401, headers: CORS }
    );
  }

  // Verifica expiração
  let payload;
  try {
    payload = JSON.parse(atob(payloadB64));
  } catch {
    return new Response(
      JSON.stringify({ valid: false }),
      { status: 401, headers: CORS }
    );
  }

  if (!payload.exp || Date.now() > payload.exp) {
    return new Response(
      JSON.stringify({ valid: false, expired: true }),
      { status: 401, headers: CORS }
    );
  }

  return new Response(JSON.stringify({ valid: true }), { status: 200, headers: CORS });
}
