// Cloudflare Pages Function — /api/admin-login
// Valida as credenciais do admin usando variáveis de ambiente da Cloudflare.
// NUNCA expõe a senha no código-fonte — tudo fica nas env vars do painel.
//
// Variáveis de ambiente necessárias (configure em Cloudflare Pages → Settings → Environment variables):
//   ADMIN_USER            — nome de usuário do admin (ex: "topmix_admin")
//   ADMIN_PASS            — senha do admin (use algo longo e aleatório)
//   ADMIN_SESSION_SECRET  — segredo para assinar os tokens de sessão (64+ caracteres aleatórios)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

/** Assina um payload com HMAC-SHA256 usando a chave secreta */
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

/** Comparação em tempo constante para evitar timing attacks */
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) {
    // Ainda percorre 'a' para não vazar o tamanho via tempo
    let dummy = 0;
    for (let i = 0; i < a.length; i++) dummy |= a.charCodeAt(i);
    return false;
  }
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

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: CORS }
    );
  }

  // Verifica configuração do servidor
  const ADMIN_USER = env.ADMIN_USER;
  const ADMIN_PASS = env.ADMIN_PASS;
  const ADMIN_SESSION_SECRET = env.ADMIN_SESSION_SECRET;

  if (!ADMIN_USER || !ADMIN_PASS || !ADMIN_SESSION_SECRET) {
    console.error("[admin-login] Variáveis de ambiente não configuradas.");
    return new Response(
      JSON.stringify({ error: "Servidor não configurado corretamente." }),
      { status: 500, headers: CORS }
    );
  }

  // Lê o body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "JSON inválido" }),
      { status: 400, headers: CORS }
    );
  }

  const { usuario, senha } = body ?? {};

  // Valida credenciais com comparação em tempo constante
  const userOk = timingSafeEqual(String(usuario ?? ""), ADMIN_USER);
  const passOk = timingSafeEqual(String(senha ?? ""), ADMIN_PASS);

  if (!userOk || !passOk) {
    // Delay fixo para dificultar brute-force
    await new Promise((r) => setTimeout(r, 1500));
    return new Response(
      JSON.stringify({ error: "Usuário ou senha incorretos." }),
      { status: 401, headers: CORS }
    );
  }

  // Gera token assinado com expiração
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = JSON.stringify({ exp });
  const payloadB64 = btoa(payload);
  const sig = await hmacSign(payloadB64, ADMIN_SESSION_SECRET);
  const token = `${payloadB64}.${sig}`;

  return new Response(JSON.stringify({ token }), { status: 200, headers: CORS });
}
