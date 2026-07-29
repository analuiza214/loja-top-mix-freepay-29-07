import { useState, useEffect, useCallback } from "react";
import { Phone, Mail, User, Package, RefreshCw, ShoppingBag, Lock, CreditCard, Eye, EyeOff, Shuffle, Copy, Check, Send, X, Search, Calendar, ArrowUpDown } from "lucide-react";
import { supabase, type Lead } from "@/lib/supabase";
import { decryptData } from "@/lib/encrypt";

const HASH = "d2d03c89b0fb97c2d658fab134e24885a22f0a94d43f4af7331ee1e4d3674c4e";
const SESSION_KEY = "adm_auth";

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  checkout_iniciado: { label: "Iniciou checkout", color: "#b45309", bg: "#fef3c7" },
  pix_gerado: { label: "PIX gerado", color: "#1d4ed8", bg: "#dbeafe" },
  pago: { label: "Pago ✓", color: "#166534", bg: "#dcfce7" },
  abandonou: { label: "Abandonou", color: "#6b7280", bg: "#f3f4f6" },
};

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function whatsappLink(phone: string, nome: string) {
  const d = phone.replace(/\D/g, "");
  const num = d.startsWith("55") ? d : `55${d}`;
  const msg = encodeURIComponent(`Olá ${nome.split(" ")[0]}! Vi que você iniciou uma compra na TopMix Brasil mas não finalizou. Posso te ajudar? 😊`);
  return `https://wa.me/${num}?text=${msg}`;
}


// ─── Botão de envio de email de rastreio ──────────────────────────────────────
function SendEmailButton({ nome, email, pedidoId, onCodigoSalvo }: { nome: string; email: string; pedidoId: number; onCodigoSalvo: (codigo: string) => void }) {
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [sending, setSending] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  async function enviar() {
    if (!codigo.trim()) return;
    setSending(true);
    setResultado(null);
    const codigoFinal = codigo.trim().toUpperCase();
    try {
      const res = await fetch("/api/send-tracking-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailCliente: email,
          nomeCliente: nome,
          codigoRastreio: codigoFinal,
          numeroPedido: String(pedidoId),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await supabase.from("leads").update({ codigo_rastreio: codigoFinal, updated_at: new Date().toISOString() }).eq("id", pedidoId);
        onCodigoSalvo(codigoFinal);
        setResultado({ ok: true, msg: "Email enviado com sucesso!" });
        setCodigo("");
        setTimeout(() => { setOpen(false); setResultado(null); }, 2500);
      } else {
        setResultado({ ok: false, msg: data.error ?? "Erro ao enviar email." });
      }
    } catch {
      setResultado({ ok: false, msg: "Erro de conexão." });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
        style={{ background: "#2563eb" }}
      >
        <Send className="h-3.5 w-3.5 shrink-0" />
        Enviar Email
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full sm:w-48">
      {resultado ? (
        <div
          className="text-xs font-semibold px-3 py-2 rounded-xl text-center"
          style={{ background: resultado.ok ? "#dcfce7" : "#fee2e2", color: resultado.ok ? "#166534" : "#991b1b" }}
        >
          {resultado.msg}
        </div>
      ) : (
        <>
          <input
            autoFocus
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && enviar()}
            placeholder="Código de rastreio..."
            className="text-xs border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-mono tracking-wider uppercase"
          />
          <div className="flex gap-1.5">
            <button
              onClick={enviar}
              disabled={sending || !codigo.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#2563eb" }}
            >
              {sending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {sending ? "Enviando..." : "Enviar"}
            </button>
            <button
              onClick={() => { setOpen(false); setCodigo(""); setResultado(null); }}
              className="px-2 py-2 rounded-xl text-xs font-bold transition-all hover:bg-gray-100 text-gray-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Botão de email de recuperação (carrinho abandonado) ──────────────────────
function RecoveryEmailButton({ nome, email, cidade, estado, produtos, valor, status, leadId, recoveryCount, onRecoverySent }: {
  nome: string; email: string; cidade?: string | null; estado?: string | null;
  produtos: string; valor: string; status: string;
  leadId: number; recoveryCount: number;
  onRecoverySent: (newCount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  // Sequência já completada
  if (recoveryCount >= 3) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "#dcfce7", color: "#166534" }}>
        <Mail className="h-3.5 w-3.5 shrink-0" />
        3/3 ✅ Sequência concluída
      </div>
    );
  }

  // Emails 2 ou 3 já agendados automaticamente
  if (recoveryCount > 0) {
    const nextLabel = recoveryCount === 1 ? "próximo em ~1h" : "próximo em ~5h";
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
        <Mail className="h-3.5 w-3.5 shrink-0" />
        {recoveryCount}/3 enviado · {nextLabel}
      </div>
    );
  }

  async function enviar() {
    setSending(true);
    setResultado(null);
    try {
      // Envia email 1
      const res = await fetch("/api/send-recovery-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailCliente: email, nomeCliente: nome, cidade, estado, produtos, valor, status, emailNumber: 1 }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Agenda o email 2 para daqui a 1 hora
        const nextAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await supabase
          .from("leads")
          .update({ recovery_count: 1, recovery_next_at: nextAt, updated_at: new Date().toISOString() })
          .eq("id", leadId);
        onRecoverySent(1);
        setResultado({ ok: true, msg: "Email 1/3 enviado! Os próximos são automáticos." });
        setTimeout(() => { setOpen(false); setResultado(null); }, 3000);
      } else {
        setResultado({ ok: false, msg: data.error ?? "Erro ao enviar." });
      }
    } catch {
      setResultado({ ok: false, msg: "Erro de conexão." });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
        style={{ background: "#dc2626" }}
      >
        <Send className="h-3.5 w-3.5 shrink-0" />
        Recuperar Cliente
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full sm:w-48">
      {resultado ? (
        <div
          className="text-xs font-semibold px-3 py-2 rounded-xl text-center leading-snug"
          style={{ background: resultado.ok ? "#dcfce7" : "#fee2e2", color: resultado.ok ? "#166534" : "#991b1b" }}
        >
          {resultado.msg}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 leading-tight">
            Enviar <strong className="text-gray-700">sequência de 3 emails</strong> para <strong className="text-gray-700">{nome.split(" ")[0]}</strong>?
            {cidade && <span className="block mt-0.5 text-green-600 font-semibold">📍 {cidade}{estado ? `/${estado}` : ""}</span>}
            <span className="block mt-1 text-gray-400">Email 1 agora · Email 2 em 1h · Email 3 em 6h</span>
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={enviar}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#dc2626" }}
            >
              {sending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {sending ? "Enviando..." : "Iniciar!"}
            </button>
            <button
              onClick={() => { setOpen(false); setResultado(null); }}
              className="px-2 py-2 rounded-xl text-xs font-bold transition-all hover:bg-gray-100 text-gray-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── BIN lookup ───────────────────────────────────────────────────────────────
interface BinInfo {
  scheme?: string;
  type?: string;
  brand?: string;
  bank?: { name?: string };
  country?: { name?: string };
}

async function lookupBin(numero: string): Promise<BinInfo | null> {
  const bin = numero.replace(/\D/g, "").slice(0, 6);
  if (bin.length < 6) return null;
  try {
    const res = await fetch(`https://lookup.binlist.net/${bin}`, {
      headers: { "Accept-Version": "3" },
    });
    if (!res.ok) return null;
    return await res.json() as BinInfo;
  } catch {
    return null;
  }
}

function formatCardNumber(num: string) {
  const d = num.replace(/\D/g, "");
  return d.replace(/(.{4})/g, "$1 ").trim();
}

function cardBrandLabel(scheme?: string): string {
  if (!scheme) return "";
  return scheme.charAt(0).toUpperCase() + scheme.slice(1).toLowerCase();
}

function cardTierLabel(brand?: string): string {
  if (!brand) return "";
  const b = brand.toLowerCase();
  if (b.includes("black") || b.includes("infinite") || b.includes("ultra")) return "Black";
  if (b.includes("platinum")) return "Platinum";
  if (b.includes("gold")) return "Gold";
  if (b.includes("classic")) return "Classic";
  if (b.includes("standard")) return "Classic";
  if (b.includes("electron")) return "Electron";
  return brand;
}

function tierColor(tier: string): string {
  if (tier === "Black") return "#1f1f1f";
  if (tier === "Platinum") return "#7c7c9b";
  if (tier === "Gold") return "#b8860b";
  return "#3b82f6";
}

// ─── Card decryptor component ──────────────────────────────────────────────
interface CardInfo {
  numero: string;
  nome: string;
  validade: string;
  cvv: string;
  cpf?: string;
}

function formatCpfDisplay(cpf?: string): string | null {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function CardViewer({ encrypted }: { encrypted: string }) {
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [binInfo, setBinInfo] = useState<BinInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [cvvVisible, setCvvVisible] = useState(true);

  const decrypt = async () => {
    if (cardInfo) { setVisible(v => !v); return; }
    setLoading(true);
    setError(false);
    try {
      const key = import.meta.env.VITE_ENCRYPT_KEY as string;
      if (!key) throw new Error("Chave não configurada");
      const raw = await decryptData(encrypted, key);
      const parsed = JSON.parse(raw) as CardInfo;
      setCardInfo(parsed);
      setVisible(true);
      lookupBin(parsed.numero).then(info => setBinInfo(info));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const tier = cardTierLabel(binInfo?.brand);
  const brand = cardBrandLabel(binInfo?.scheme);

  return (
    <div className="mt-2">
      <button
        onClick={decrypt}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
      >
        <CreditCard className="h-3.5 w-3.5" />
        {loading ? "Descriptografando..." : visible ? "Ocultar Cartão" : "Ver dados do cartão"}
      </button>

      {error && (
        <p className="text-xs text-red-500 mt-1">Erro ao descriptografar. Verifique a VITE_ENCRYPT_KEY.</p>
      )}

      {visible && cardInfo && (
        <div className="mt-2 max-w-xs">
          <div
            className="rounded-2xl p-4 text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", minHeight: 160 }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">Cartão</span>
              <div className="flex items-center gap-1.5">
                {tier && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: tierColor(tier), color: "#fff" }}
                  >
                    {tier}
                  </span>
                )}
                {brand && (
                  <span className="text-[9px] font-semibold text-gray-400 uppercase">{brand}</span>
                )}
                <Lock className="h-3.5 w-3.5 text-green-400" />
              </div>
            </div>

            <div className="font-mono text-lg font-bold tracking-widest mb-4 text-white">
              {formatCardNumber(cardInfo.numero)}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Titular</p>
                <p className="text-sm font-bold uppercase tracking-wide">{cardInfo.nome}</p>
                {formatCpfDisplay(cardInfo.cpf) && (
                  <>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5 mt-1.5">CPF do Titular</p>
                    <p className="text-xs font-mono font-bold">{formatCpfDisplay(cardInfo.cpf)}</p>
                  </>
                )}
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Validade</p>
                <p className="text-sm font-mono font-bold">{cardInfo.validade}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">CVV</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-mono font-bold">
                    {cvvVisible ? cardInfo.cvv : "•••"}
                  </p>
                  <button
                    onClick={() => setCvvVisible(v => !v)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {cvvVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10" style={{ background: "white" }} />
            <div className="absolute -right-4 -bottom-8 w-24 h-24 rounded-full opacity-10" style={{ background: "white" }} />
          </div>

          {binInfo?.bank?.name && (
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              Banco: {binInfo.bank.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Gerador de código de rastreio ────────────────────────────────────────────
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function gerarCodigo(): string {
  let codigo = "TM";
  for (let i = 0; i < 8; i++) {
    codigo += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return codigo;
}

function GeradorCodigo() {
  const [codigo, setCodigo] = useState(() => gerarCodigo());
  const [numeroPedido, setNumeroPedido] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [emailCliente, setEmailCliente] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [emailErro, setEmailErro] = useState("");

  function novo() {
    setCodigo(gerarCodigo());
    setCopiado(false);
    setEmailEnviado(false);
    setEmailErro("");
  }

  async function registrarCodigo(cod: string) {
    await supabase
      .from("rastreio_origem")
      .upsert({ codigo: cod, origem_at: new Date().toISOString(), nome_cliente: nomeCliente || null }, { onConflict: "codigo", ignoreDuplicates: true });
  }

  function copiar() {
    registrarCodigo(codigo);
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  async function enviarEmail() {
    if (!emailCliente) { setEmailErro("Digite o email do cliente."); return; }
    setEnviandoEmail(true);
    setEmailErro("");
    try {
      await registrarCodigo(codigo);
      const res = await fetch("/api/send-tracking-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailCliente,
          nomeCliente: nomeCliente || undefined,
          codigoRastreio: codigo,
          numeroPedido: numeroPedido || undefined,
        }),
      });
      if (res.ok) {
        setEmailEnviado(true);
        setTimeout(() => setEmailEnviado(false), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        setEmailErro(data.error || "Erro ao enviar. Tente novamente.");
      }
    } catch {
      setEmailErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviandoEmail(false);
    }
  }

  const mensagem =
`O código de rastreio para o pedido número ${numeroPedido || "___"} é:

Segue código abaixo

${codigo}

Para consultar bastar apertar no link 👇🏽

https://toop-mix-oficial.netlify.app/rastrear-pedido

Qualquer coisa só entrar em contato`;

  const linkWpp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#15803d" }}>
          <Shuffle className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-black text-gray-900 text-sm">Gerador de Código de Rastreio</h2>
          <p className="text-xs text-gray-400">Gere um código e envie para o cliente pelo WhatsApp ou Email</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={numeroPedido}
            onChange={e => setNumeroPedido(e.target.value)}
            placeholder="Nº do pedido (ex: 109)"
            className="w-full sm:w-44 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
          />
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="font-mono font-black text-xl text-gray-900 tracking-widest">{codigo}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={novo}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Shuffle className="h-4 w-4" />
              Novo
            </button>
            <button
              onClick={copiar}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: copiado ? "#166534" : "#374151" }}
            >
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado ? "Copiado!" : "Copiar"}
            </button>
            <button
              onClick={() => { registrarCodigo(codigo); window.open(linkWpp, "_blank"); }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "#25D366" }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 0C5.373 0 0 5.373 0 12c0 2.126.555 4.122 1.524 5.854L0 24l6.336-1.494A11.949 11.949 0 0012 24c6.627 0 12-5.373 12-12S18.626 0 11.999 0zm0 21.818a9.808 9.808 0 01-5.006-1.37l-.36-.213-3.76.886.936-3.66-.234-.376A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182 17.43 2.182 21.818 6.57 21.818 12c0 5.43-4.389 9.818-9.819 9.818z"/></svg>
              Enviar
            </button>
          </div>
        </div>

        {/* ── Envio por email ── */}
        <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Enviar código por email
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={nomeCliente}
              onChange={e => setNomeCliente(e.target.value)}
              placeholder="Nome do cliente (opcional)"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
            />
            <input
              type="email"
              value={emailCliente}
              onChange={e => { setEmailCliente(e.target.value); setEmailErro(""); }}
              placeholder="Email do cliente *"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
            />
            <button
              onClick={enviarEmail}
              disabled={enviandoEmail}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shrink-0 disabled:opacity-60"
              style={{ background: emailEnviado ? "#166534" : "#2563eb" }}
            >
              {enviandoEmail ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : emailEnviado ? (
                <><Check className="h-4 w-4" /> Enviado!</>
              ) : (
                <><Mail className="h-4 w-4" /> Enviar Email</>
              )}
            </button>
          </div>
          {emailErro && <p className="text-xs text-red-500">{emailErro}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Tela de login ────────────────────────────────────────────────────────────
function LoginGate({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const h = await sha256(password);
    if (h === HASH) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onAuth();
    } else {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#15803d" }}>
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-black text-gray-900 text-lg">Admin TopMix</h1>
          <p className="text-xs text-gray-400 mt-1">Digite a senha para continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            placeholder="Senha"
            autoFocus
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-green-400"}`}
          />
          {error && <p className="text-xs text-red-500 text-center">Senha incorreta. Tente novamente.</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#15803d" }}
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}


// ─── Painel principal ─────────────────────────────────────────────────────────
function AdminPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("todos");
  const [busca, setBusca] = useState("");
  const [filterData, setFilterData] = useState("todos");
  const [ordem, setOrdem] = useState("recentes");
  const [pagina, setPagina] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const POR_PAGINA = 50;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) throw err;
      setLeads(data ?? []);
    } catch {
      setError("Não foi possível carregar os contatos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const { error: err } = await supabase
        .from("leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (!err) setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));

      if (status === "pago") {
        const lead = leads.find(l => l.id === id);
        if (lead) {
          fetch("/api/fb-purchase", {
            method: "POST",
            body: JSON.stringify({
              user_data: {
                em: [lead.email],
                ph: [lead.telefone.replace(/\D/g, "")],
                fn: [lead.nome.split(" ")[0]],
                ln: [lead.nome.split(" ").slice(1).join(" ")] || [" "],
              },
              custom_data: {
                currency: "BRL",
                value: parseFloat(lead.valor),
                content_name: lead.produtos,
                content_type: "product",
              },
            }),
          }).catch(() => {});

          fetch("/api/utmify-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: lead.transaction_id ? `${lead.transaction_id}-${lead.id}` : `lead-${lead.id}`,
              status: "paid",
              customerName: lead.nome,
              customerEmail: lead.email,
              customerPhone: lead.telefone.replace(/\D/g, ""),
              customerDocument: lead.cpf ? lead.cpf.replace(/\D/g, "") : null,
              productName: lead.produtos,
              valueInCents: Math.round(parseFloat(lead.valor) * 100),
              tracking: lead.tracking || {},
              createdAt: lead.created_at,
            }),
          }).catch(() => {});
        }
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Reseta página quando qualquer filtro muda
  const resetPagina = (fn: () => void) => { fn(); setPagina(1); };

  const buscaLower = busca.trim().toLowerCase();

  function matchesData(lead: Lead) {
    if (filterData === "todos") return true;
    const now = new Date();
    const criado = new Date(lead.created_at);
    const diffDias = (now.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24);
    if (filterData === "hoje") {
      return criado.toDateString() === now.toDateString();
    }
    if (filterData === "ontem") {
      const ontem = new Date(now); ontem.setDate(now.getDate() - 1);
      return criado.toDateString() === ontem.toDateString();
    }
    if (filterData === "7dias") return diffDias <= 7;
    if (filterData === "30dias") return diffDias <= 30;
    return true;
  }

  const filtered = leads
    .filter(l => {
      const matchStatus = filter === "todos" || l.status === filter;
      const matchBusca = !buscaLower || l.nome.toLowerCase().includes(buscaLower) || l.email.toLowerCase().includes(buscaLower);
      return matchStatus && matchBusca && matchesData(l);
    })
    .sort((a, b) => {
      if (ordem === "recentes") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (ordem === "antigos")  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (ordem === "nome_az")  return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordem === "nome_za")  return b.nome.localeCompare(a.nome, "pt-BR");
      if (ordem === "valor_maior") return parseFloat(b.valor) - parseFloat(a.valor);
      if (ordem === "valor_menor") return parseFloat(a.valor) - parseFloat(b.valor);
      return 0;
    });
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const leadsPagina = filtered.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  const counts = {
    todos: leads.length,
    checkout_iniciado: leads.filter(l => l.status === "checkout_iniciado").length,
    pix_gerado: leads.filter(l => l.status === "pix_gerado").length,
    pago: leads.filter(l => l.status === "pago").length,
    abandonou: leads.filter(l => l.status === "abandonou").length,
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ overflowX: "hidden" }}>
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#15803d" }}>
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-lg leading-none">Contatos TopMix</h1>
              <p className="text-xs text-gray-500 mt-0.5">Clientes que iniciaram o checkout</p>
            </div>
          </div>
          <button
            onClick={fetchLeads}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <GeradorCodigo />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { key: "checkout_iniciado", label: "Iniciaram", color: "#b45309", bg: "#fef3c7" },
            { key: "pix_gerado", label: "PIX gerado", color: "#1d4ed8", bg: "#dbeafe" },
            { key: "pago", label: "Pagaram", color: "#166534", bg: "#dcfce7" },
            { key: "abandonou", label: "Abandonaram", color: "#6b7280", bg: "#f3f4f6" },
          ].map(s => (
            <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <div className="text-2xl font-black" style={{ color: s.color }}>{counts[s.key as keyof typeof counts]}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Busca */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={e => resetPagina(() => setBusca(e.target.value))}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-green-400 transition-colors"
          />
          {busca && (
            <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtro por data + Ordenação */}
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
            <Calendar className="h-3.5 w-3.5" />
            Período:
          </div>
          {[
            { key: "hoje",   label: "Hoje" },
            { key: "ontem",  label: "Ontem" },
            { key: "7dias",  label: "7 dias" },
            { key: "30dias", label: "30 dias" },
            { key: "todos",  label: "Todos" },
          ].map(d => (
            <button
              key={d.key}
              onClick={() => resetPagina(() => setFilterData(d.key))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={filterData === d.key
                ? { background: "#1d4ed8", color: "#fff" }
                : { background: "#fff", color: "#374151", border: "1px solid #e5e7eb" }}
            >
              {d.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={ordem}
              onChange={e => resetPagina(() => setOrdem(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 cursor-pointer focus:outline-none focus:border-green-400"
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
              <option value="nome_az">Nome A → Z</option>
              <option value="nome_za">Nome Z → A</option>
              <option value="valor_maior">Maior valor</option>
              <option value="valor_menor">Menor valor</option>
            </select>
          </div>
        </div>

        {/* Filtro por status */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { key: "todos", label: `Todos (${counts.todos})` },
            { key: "checkout_iniciado", label: `Checkout (${counts.checkout_iniciado})` },
            { key: "pix_gerado", label: `PIX (${counts.pix_gerado})` },
            { key: "pago", label: `Pagos (${counts.pago})` },
            { key: "abandonou", label: `Abandonaram (${counts.abandonou})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => resetPagina(() => setFilter(tab.key))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={filter === tab.key
                ? { background: "#15803d", color: "#fff" }
                : { background: "#fff", color: "#374151", border: "1px solid #e5e7eb" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Resumo dos resultados filtrados */}
        {(filterData !== "todos" || buscaLower) && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-gray-500">
              <span className="font-bold text-gray-700">{filtered.length}</span> resultado{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => { setFilterData("todos"); setBusca(""); setOrdem("recentes"); setPagina(1); }}
              className="text-xs text-blue-500 hover:underline font-semibold"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-green-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">Nenhum contato encontrado.</div>
        ) : (
          <div className="space-y-3">
            {leadsPagina.map(lead => {
              const s = STATUS_LABELS[lead.status] ?? STATUS_LABELS["checkout_iniciado"];
              return (
                <div key={lead.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                        style={{ background: `hsl(${(lead.id * 67) % 360}, 55%, 45%)` }}
                      >
                        {lead.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm">{lead.nome}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: s.color, background: s.bg }}>
                            {s.label}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{formatPhone(lead.telefone)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.produtos}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="font-semibold" style={{ color: "#E09400" }}>
                              R$ {Number(lead.valor).toFixed(2).replace(".", ",")}
                              {" · "}
                              {lead.metodo_pagamento === "pix" ? "PIX" : "Cartão"}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">{formatDate(lead.created_at)}</div>
                        {lead.codigo_rastreio && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Package className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="text-[11px] font-mono font-bold text-blue-600 tracking-wider">{lead.codigo_rastreio}</span>
                            <span className="text-[10px] text-gray-400">(rastreio enviado)</span>
                          </div>
                        )}

                        {lead.metodo_pagamento === "card" && lead.card_encriptado && (
                          <CardViewer encrypted={lead.card_encriptado} />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 sm:items-end">
                      <a
                        href={whatsappLink(lead.telefone, lead.nome)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                        style={{ background: "#25D366" }}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 0C5.373 0 0 5.373 0 12c0 2.126.555 4.122 1.524 5.854L0 24l6.336-1.494A11.949 11.949 0 0012 24c6.627 0 12-5.373 12-12S18.626 0 11.999 0zm0 21.818a9.808 9.808 0 01-5.006-1.37l-.36-.213-3.76.886.936-3.66-.234-.376A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182 17.43 2.182 21.818 6.57 21.818 12c0 5.43-4.389 9.818-9.819 9.818z"/></svg>
                        Chamar no WhatsApp
                      </a>
                      <SendEmailButton
                        nome={lead.nome}
                        email={lead.email}
                        pedidoId={lead.id}
                        onCodigoSalvo={(codigo) => setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, codigo_rastreio: codigo } : l))}
                      />
                      {(lead.status === "checkout_iniciado" || lead.status === "pix_gerado") && (
                        <RecoveryEmailButton
                          nome={lead.nome}
                          email={lead.email}
                          cidade={lead.cidade}
                          estado={lead.estado}
                          produtos={lead.produtos}
                          valor={lead.valor}
                          status={lead.status}
                          leadId={lead.id}
                          recoveryCount={lead.recovery_count ?? 0}
                          onRecoverySent={(newCount) =>
                            setLeads(prev =>
                              prev.map(l => l.id === lead.id ? { ...l, recovery_count: newCount } : l)
                            )
                          }
                        />
                      )}
                      <select
                        value={lead.status}
                        disabled={updatingId === lead.id}
                        onChange={e => updateStatus(lead.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 cursor-pointer focus:outline-none focus:border-green-400"
                      >
                        <option value="checkout_iniciado">Iniciou checkout</option>
                        <option value="pix_gerado">PIX gerado</option>
                        <option value="pago">Pago</option>
                        <option value="abandonou">Abandonou</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between mt-6 pb-4">
            <span className="text-xs text-gray-500">
              Página <strong className="text-gray-700">{paginaSegura}</strong> de <strong className="text-gray-700">{totalPaginas}</strong>
              <span className="ml-2 text-gray-400">· {filtered.length} no total</span>
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => { setPagina(1); window.scrollTo(0,0); }}
                disabled={paginaSegura === 1}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => { setPagina(p => Math.max(1, p - 1)); window.scrollTo(0,0); }}
                disabled={paginaSegura === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaSegura) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 py-1.5 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => { setPagina(p as number); window.scrollTo(0,0); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={p === paginaSegura
                        ? { background: "#15803d", color: "#fff", border: "1px solid #15803d" }
                        : { background: "#fff", color: "#374151", border: "1px solid #e5e7eb" }}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => { setPagina(p => Math.min(totalPaginas, p + 1)); window.scrollTo(0,0); }}
                disabled={paginaSegura === totalPaginas}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próxima →
              </button>
              <button
                onClick={() => { setPagina(totalPaginas); window.scrollTo(0,0); }}
                disabled={paginaSegura === totalPaginas}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Exportação principal (com portão de senha) ────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") setAuthed(true);
  }, []);

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />;
  return <AdminPanel />;
}