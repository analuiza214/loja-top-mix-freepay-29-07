# Migração Netlify → Cloudflare Pages

## O que foi feito

- ✅ Todas as 7 funções serverless convertidas para **Cloudflare Pages Functions** (pasta `functions/`)
- ✅ Todos os links `/.netlify/functions/xxx` no frontend atualizados para `/api/xxx`
- ✅ `vite.config.ts` limpo (removidos plugins exclusivos do Replit)
- ✅ `public/_redirects` criado (suporte ao React Router — SPA)
- ✅ `wrangler.toml` criado com a configuração do projeto

---

## Como fazer o deploy no Cloudflare Pages

### 1. Faça push deste projeto para o GitHub
```bash
git add .
git commit -m "feat: migração para Cloudflare Pages"
git push
```

### 2. Acesse o Cloudflare Pages
- Entre em https://pages.cloudflare.com
- Clique em **Create a project** → **Connect to Git**
- Selecione o repositório

### 3. Configure o build
| Campo | Valor |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20` |

### 4. Configure as variáveis de ambiente
Vá em **Settings → Environment variables** e adicione as mesmas variáveis que você tinha na Netlify:

| Variável | Onde usar |
|---|---|
| `IRONPAY_API_TOKEN` | Production |
| `IRONPAY_OFFER_HASH` | Production |
| `IRONPAY_PRODUCT_HASH` | Production |
| `SUPABASE_URL` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Production |
| `VITE_SUPABASE_URL` | Production |
| `VITE_SUPABASE_KEY` | Production |
| `VITE_ENCRYPT_KEY` | Production |
| `UTMIFY_API_TOKEN` | Production |
| `FB_PIXEL_ID` | Production |
| `FB_ACCESS_TOKEN` | Production |
| `RESEND_API_KEY` | Production |
| `RESEND_FROM_EMAIL` | Production |
| `SITE_URL` | Production ← **NOVA**: coloque a URL do seu site (ex: `https://loja-top-mix.pages.dev`) |
| `CRON_SECRET` | Production ← **NOVA** (opcional): qualquer senha para proteger o cron |

### 5. Configure o cron de recuperação de emails
O Cloudflare Pages não tem cron nativo. Use o **cron-job.org** (gratuito):

1. Acesse https://cron-job.org e crie uma conta gratuita
2. Crie um novo job:
   - **URL**: `https://SEU-DOMINIO.pages.dev/api/process-recovery-queue`
   - **Método**: POST
   - **Header**: `x-cron-secret: SEU_CRON_SECRET` (o mesmo valor da variável `CRON_SECRET`)
   - **Intervalo**: a cada 15 minutos

### 6. Atualize a URL do webhook IronPay
No painel da IronPay, atualize o webhook para:
```
https://SEU-DOMINIO.pages.dev/api/pix/webhook
```

---

## Resumo das mudanças técnicas

| Antes (Netlify) | Depois (Cloudflare) |
|---|---|
| `exports.handler = async (event) => {}` | `export async function onRequest(context) {}` |
| `event.httpMethod` | `context.request.method` |
| `event.body` | `await context.request.json()` |
| `event.queryStringParameters.id` | `new URL(request.url).searchParams.get('id')` |
| `process.env.VAR` | `context.env.VAR` |
| Node.js `https.request()` | Web API `fetch()` |
| Node.js `crypto.createHash` | Web Crypto `crypto.subtle.digest` |
| `return { statusCode, headers, body }` | `return new Response(body, { status, headers })` |
| Cron via `netlify.toml` | Cron externo (cron-job.org) |

---

## Estrutura do projeto após migração

```
functions/
  api/
    pix/
      create.js          ← /api/pix/create
      status.js          ← /api/pix/status
      webhook.js         ← /api/pix/webhook
    send-tracking-email.js   ← /api/send-tracking-email
    send-recovery-email.js   ← /api/send-recovery-email
    fb-purchase.js           ← /api/fb-purchase
    utmify-order.js          ← /api/utmify-order
    process-recovery-queue.js ← /api/process-recovery-queue (cron via cron-job.org)
public/
  _redirects             ← SPA fallback (React Router)
wrangler.toml            ← Configuração Cloudflare
```
