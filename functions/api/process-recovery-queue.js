// Cloudflare Pages Function — /api/process-recovery-queue
//
// AUTOMATICO: dispara sozinho a sequencia de recuperacao.
//  - FASE A (auto-start): lead com PIX gerado ha mais de 30 min, ainda nao pago
//    e sem nenhum email enviado -> envia o EMAIL 1 e agenda o proximo.
//    Dedupe por email: se o mesmo cliente gerou PIX mais de uma vez, a sequencia
//    e enviada apenas UMA vez (para o lead mais recente); os duplicados sao
//    marcados com recovery_count = -1 e ignorados dali em diante.
//  - FASE B (follow-ups): envia os emails 2 e 3 nos horarios agendados.
//
// Cadencia: email 1 aos 30 min | email 2 +4h | email 3 +24h.
// Se o lead for marcado como "pago" no admin (ou pagar), a sequencia para sozinha,
// pois so processamos status checkout_iniciado / pix_gerado.
//
// ANTI-DUPLICADO: cada lead e "travado" no banco (update condicional) ANTES do
// envio. Se duas execucoes do cron rodarem ao mesmo tempo, so uma consegue a
// trava — o cliente nunca recebe o mesmo email duas vezes.
//
// IMPORTANTE: O Cloudflare Pages nao tem funcao agendada nativa.
// Configure um cron gratuito externo (ex: cron-job.org) para chamar:
//   POST https://SEU-DOMINIO.pages.dev/api/process-recovery-queue
// a cada 10-15 minutos, com o header: x-cron-secret: SEU_CRON_SECRET
//
// Variaveis de ambiente necessarias no Cloudflare:
//   SUPABASE_URL              — URL do projeto Supabase
//   SUPABASE_SERVICE_ROLE_KEY — chave service_role
//   SITE_URL                  — URL do seu site (ex: https://seusite.pages.dev)
//   CRON_SECRET               — segredo para proteger esse endpoint (opcional mas recomendado)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const MINUTOS_ATE_EMAIL_1 = 30;            // PIX gerado ha 30 min sem pagar
const HORAS_ATE_EMAIL_2   = 4;             // 4h depois do email 1
const HORAS_ATE_EMAIL_3   = 24;            // 24h depois do email 2

async function supabaseFetch(supabaseUrl, supabaseKey, path, options = {}) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {}),
    },
  });
  try { return { status: res.status, body: await res.json() }; }
  catch { return { status: res.status, body: await res.text() }; }
}

// Update condicional: so aplica se o lead ainda estiver no estado esperado.
// Retorna true se ESTA execucao conseguiu a trava (linha foi atualizada).
async function claim(supabaseUrl, supabaseKey, leadId, conditionQs, patch) {
  const { status, body } = await supabaseFetch(
    supabaseUrl, supabaseKey,
    `/rest/v1/leads?id=eq.${leadId}&${conditionQs}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return status < 400 && Array.isArray(body) && body.length > 0;
}

async function enviarEmail(SITE_URL, lead, emailNum) {
  try {
    const res = await fetch(`${SITE_URL}/api/send-recovery-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailCliente: lead.email,
        nomeCliente: lead.nome,
        cidade: lead.cidade,
        estado: lead.estado,
        produtos: lead.produtos,
        valor: lead.valor,
        emailNum,
        status: lead.status,
        storeUrl: SITE_URL,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: corsHeaders });

  try {

    const CRON_SECRET = env.CRON_SECRET;
    if (CRON_SECRET) {
      const provided = request.headers.get("x-cron-secret");
      if (provided !== CRON_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
    }

    // .trim() remove espacos/quebras de linha invisiveis colados junto no painel
    const SUPABASE_URL = (env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const SUPABASE_KEY = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const SITE_URL     = (env.SITE_URL || "").trim().replace(/\/+$/, "");

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(JSON.stringify({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados." }), { status: 500, headers: corsHeaders });
    }

    const now = new Date().toISOString();
    const cutoff30min = new Date(Date.now() - MINUTOS_ATE_EMAIL_1 * 60 * 1000).toISOString();
    // Janela de 24h: leads mais antigos que isso NUNCA entram na automacao
    // (evita disparar email para clientes antigos quando a automacao e ligada)
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const NAO_INICIADO = `or=(recovery_count.is.null,recovery_count.eq.0)`;

    let started = 0, followups = 0, deduped = 0, errors = 0;

    // ============================================================
    // FASE A — AUTO-START: PIX gerado ha 30+ min, sem email enviado
    // ============================================================
    const queryNew = [
      `status=eq.pix_gerado`,
      NAO_INICIADO,
      `created_at=lte.${encodeURIComponent(cutoff30min)}`,
      `created_at=gte.${encodeURIComponent(cutoff24h)}`,
      `order=created_at.desc`,
      `limit=10`,
      `select=id,nome,email,cidade,estado,produtos,valor,status,recovery_count,created_at`,
    ].join("&");

    const { body: novos, status: novosStatus } = await supabaseFetch(
      SUPABASE_URL, SUPABASE_KEY, `/rest/v1/leads?${queryNew}`
    );

    if (novosStatus < 400 && Array.isArray(novos) && novos.length > 0) {
      // Dedupe 1: emails que JA receberam recuperacao (qualquer lead) ou ja pagaram
      const emails = [...new Set(novos.map(l => (l.email || "").toLowerCase()).filter(Boolean))];
      const emailList = emails.map(e => `"${e.replace(/[",()]/g, "")}"`).join(",");
      const { status: dedupStatus, body: jaTratados } = await supabaseFetch(
        SUPABASE_URL, SUPABASE_KEY,
        `/rest/v1/leads?email=in.(${encodeURIComponent(emailList)})&or=(recovery_count.gte.1,status.eq.pago)&select=email`
      );

      if (dedupStatus >= 400 || !Array.isArray(jaTratados)) {
        // Sem a lista de dedupe nao da pra garantir envio unico — pula a fase A
        // nesta rodada (o cron tenta de novo em alguns minutos).
        console.error("[recovery-queue] Falha na consulta de dedupe; fase A adiada.", dedupStatus);
        errors++;
      } else {
        const emailsJaTratados = new Set(jaTratados.map(l => (l.email || "").toLowerCase()));

        // Dedupe 2: dentro do lote, so o lead MAIS RECENTE de cada email recebe
        const vistos = new Set();

        for (const lead of novos) {
          const email = (lead.email || "").toLowerCase();
          try {
            const ehDuplicado = !email || emailsJaTratados.has(email) || vistos.has(email);
            if (email) vistos.add(email);

            if (ehDuplicado) {
              // Marca como duplicado para nunca mais reprocessar
              await claim(SUPABASE_URL, SUPABASE_KEY, lead.id, NAO_INICIADO,
                { recovery_count: -1, recovery_next_at: null, updated_at: now });
              deduped++;
              continue;
            }

            // TRAVA antes de enviar: so envia quem conseguir atualizar 0/null -> 1
            const travou = await claim(SUPABASE_URL, SUPABASE_KEY, lead.id, NAO_INICIADO, {
              recovery_count: 1,
              recovery_next_at: new Date(Date.now() + HORAS_ATE_EMAIL_2 * 60 * 60 * 1000).toISOString(),
              updated_at: now,
            });
            if (!travou) continue; // outra execucao ja pegou este lead

            const ok = await enviarEmail(SITE_URL, lead, 1);
            if (!ok) {
              // Devolve para a fila (volta a 0) para tentar na proxima rodada
              console.error(`[recovery-queue] Erro ao enviar email 1 para lead ${lead.id}`);
              await claim(SUPABASE_URL, SUPABASE_KEY, lead.id, `recovery_count=eq.1`,
                { recovery_count: 0, recovery_next_at: null, updated_at: now });
              errors++;
              continue;
            }
            started++;
          } catch (err) {
            console.error(`[recovery-queue] Excecao no auto-start do lead ${lead.id}:`, err);
            errors++;
          }
        }
      }
    }

    // ============================================================
    // FASE B — FOLLOW-UPS: emails 2 e 3 agendados
    // ============================================================
    const queryFollow = [
      `recovery_count=gte.1`,
      `recovery_count=lte.2`,
      `recovery_next_at=lte.${encodeURIComponent(now)}`,
      `status=in.(checkout_iniciado,pix_gerado)`,
      `limit=10`,
      `select=id,nome,email,cidade,estado,produtos,valor,status,recovery_count`,
    ].join("&");

    const { body: leads, status: fetchStatus } = await supabaseFetch(
      SUPABASE_URL, SUPABASE_KEY, `/rest/v1/leads?${queryFollow}`
    );

    if (fetchStatus >= 400) {
      return new Response(JSON.stringify({ error: "Erro ao buscar leads", details: leads, iniciados: started, duplicados_ignorados: deduped }), { status: 500, headers: corsHeaders });
    }

    if (Array.isArray(leads)) {
      for (const lead of leads) {
        try {
          const countAtual = lead.recovery_count;      // 1 ou 2
          const emailNum = countAtual + 1;             // 2 ou 3
          const nextAt = emailNum < 3
            ? new Date(Date.now() + HORAS_ATE_EMAIL_3 * 60 * 60 * 1000).toISOString()
            : null;

          // TRAVA antes de enviar: so envia quem conseguir atualizar N -> N+1
          // (a condicao recovery_next_at=lte.now impede reenvio apos a trava)
          const travou = await claim(
            SUPABASE_URL, SUPABASE_KEY, lead.id,
            `recovery_count=eq.${countAtual}&recovery_next_at=lte.${encodeURIComponent(now)}`,
            { recovery_count: emailNum, recovery_next_at: nextAt, updated_at: now }
          );
          if (!travou) continue; // outra execucao ja pegou este lead

          const ok = await enviarEmail(SITE_URL, lead, emailNum);
          if (!ok) {
            // Devolve para a fila: volta ao count anterior, reagenda para +30min
            console.error(`[recovery-queue] Erro ao enviar email ${emailNum} para lead ${lead.id}`);
            await claim(SUPABASE_URL, SUPABASE_KEY, lead.id, `recovery_count=eq.${emailNum}`, {
              recovery_count: countAtual,
              recovery_next_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              updated_at: now,
            });
            errors++;
            continue;
          }
          followups++;
        } catch (err) {
          console.error(`[recovery-queue] Excecao ao processar lead ${lead.id}:`, err);
          errors++;
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, iniciados: started, followups, duplicados_ignorados: deduped, errors }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error("[recovery-queue] Erro fatal:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Erro interno na automacao", detalhe: String((err && err.message) || err) }),
      { status: 500, headers: corsHeaders }
    );
  }
}
