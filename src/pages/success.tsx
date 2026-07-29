import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { X, AlertCircle, RefreshCw, CreditCard, Copy, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { pushEcommerceEvent } from "@/lib/tracking";
import { useCart } from "@/hooks/use-cart";

type Phase = "loading" | "reveal" | "content";

interface PixData {
  transactionId: string;
  pixCode: string;
  qrCodeBase64?: string;
  qrCodeImage?: string;
}

const PixIcon = ({ size = 36 }: { size?: number }) => (
  <svg viewBox="0 0 512 512" width={size} height={size} fill="none">
    <path d="M112.57 391.19c20.056 0 38.928-7.808 53.12-22l76.693-76.692c5.385-5.386 14.765-5.373 20.136 0l76.989 76.989c14.192 14.192 33.064 22 53.12 22h15.138l-97.2 97.2c-30.418 30.417-79.73 30.417-110.148 0l-97.49-97.497h10.642z" fill="#22c55e"/>
    <path d="M112.57 120.81c20.056 0 38.928 7.808 53.12 22l76.693 76.692c5.565 5.566 14.57 5.566 20.136 0l76.989-76.989c14.192-14.192 33.064-22 53.12-22h10.642l-97.49-97.49c-30.418-30.417-79.73-30.417-110.148 0l-97.2 97.2 14.138-.413z" fill="#22c55e"/>
    <path d="M458.783 200.643l-54.36-54.36h-11.795c-14.14 0-27.68 5.62-37.667 15.606l-76.989 76.989c-13.693 13.693-37.438 13.706-51.144 0l-76.693-76.692c-9.987-9.987-23.527-15.607-37.667-15.607H97.327l-54.11 54.11c-30.418 30.417-30.418 79.73 0 110.147l54.11 54.111h15.141c14.14 0 27.68-5.62 37.667-15.607l76.693-76.692c6.924-6.924 15.983-10.387 25.572-10.387 9.588 0 18.648 3.463 25.572 10.387l76.989 76.989c9.987 9.987 23.527 15.607 37.667 15.607h11.795l54.36-54.361c30.417-30.417 30.417-79.73 0-110.24z" fill="#22c55e"/>
  </svg>
);

function ParticleBurst({ color = "#22c55e" }: { color?: string }) {
  const particles = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((i) => {
        const angle = (i / 16) * 360;
        const distance = 80 + Math.random() * 60;
        const delay = Math.random() * 0.3;
        const size = 6 + Math.floor(Math.random() * 6);
        const rad = (angle * Math.PI) / 180;
        const tx = Math.cos(rad) * distance;
        const ty = Math.sin(rad) * distance;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size, height: size, background: color,
              top: "50%", left: "50%",
              marginTop: -size / 2, marginLeft: -size / 2, opacity: 0.85,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0.9 }}
            animate={{ x: tx, y: ty, scale: 0, opacity: 0 }}
            transition={{ duration: 0.7 + Math.random() * 0.4, delay, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

function RippleRings({ color = "#22c55e" }: { color?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{ borderColor: color }}
          initial={{ width: 60, height: 60, opacity: 0.8 }}
          animate={{ width: 340, height: 340, opacity: 0 }}
          transition={{ duration: 1.4, delay: i * 0.28, ease: "easeOut", repeat: 0 }}
        />
      ))}
    </div>
  );
}

function loadPixFromStorage(): PixData | null {
  try {
    const raw = sessionStorage.getItem("pixResult");
    if (!raw) return null;
    const d = JSON.parse(raw) as {
      transactionId?: string;
      pixCode?: string;
      qrCodeBase64?: string | null;
      qrCodeImage?: string | null;
    };
    if (!d.pixCode) return null;
    return {
      transactionId: d.transactionId || "",
      pixCode: d.pixCode,
      qrCodeBase64: d.qrCodeBase64 || undefined,
      qrCodeImage: d.qrCodeImage || undefined,
    };
  } catch {
    return null;
  }
}

// ── Ajuda via WhatsApp após várias tentativas de PIX ─────────────────────────
const WHATSAPP_NUMBER = "5583991297085";

function loadPixAttempts(): number {
  try {
    const saved = JSON.parse(localStorage.getItem("topmix_pix_tentativas") || "null") as { name: string; count: number } | null;
    return saved?.count || 0;
  } catch {
    return 0;
  }
}

function whatsappHelpLink(): string {
  let nome = "";
  try {
    const saved = JSON.parse(localStorage.getItem("topmix_pix_tentativas") || "null") as { name: string; count: number } | null;
    nome = saved?.name || "";
  } catch { /* ignora */ }
  const msg = `Olá! ${nome ? `Meu nome é ${nome}. ` : ""}Gerei o Pix mais de uma vez no site e não estou conseguindo finalizar o pagamento. Pode me ajudar?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function loadCardAttempts(): number {
  try {
    const saved = JSON.parse(localStorage.getItem("topmix_card_tentativas") || "null") as { last4: string; count: number } | null;
    return saved?.count || 0;
  } catch {
    return 0;
  }
}

function whatsappCardHelpLink(last4: string): string {
  let nome = "";
  try {
    const buyer = JSON.parse(localStorage.getItem("topmix_buyer") || "null") as { nome?: string } | null;
    nome = buyer?.nome || "";
  } catch { /* ignora */ }
  const msg = `Olá! ${nome ? `Meu nome é ${nome}. ` : ""}Tentei pagar com meu cartão (final ${last4}) mais de uma vez no site e não foi autorizado. Pode me ajudar?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

const WhatsAppSvg = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ── Popup de ajuda via WhatsApp ──────────────────────────────────────────────
function WhatsAppHelpModal({
  open, onClose, href, title, text,
}: {
  open: boolean;
  onClose: () => void;
  href: string;
  title: string;
  text: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabeçalho verde WhatsApp */}
            <div
              className="relative px-6 pt-8 pb-12 text-center"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
            >
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-full bg-white mx-auto flex items-center justify-center shadow-lg text-[#25D366]"
              >
                <WhatsAppSvg size={44} />
              </motion.div>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                <p className="text-white/90 text-xs font-semibold uppercase tracking-wider">Atendimento online agora</p>
              </div>
            </div>

            {/* Corpo */}
            <div className="px-6 pt-6 pb-7 text-center -mt-6 bg-white rounded-t-3xl relative">
              <h2 className="text-xl font-black text-gray-900 leading-snug mb-2">{title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{text}</p>

              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-green-200"
                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
              >
                <WhatsAppSvg size={22} />
                Falar no WhatsApp agora
              </a>

              <button
                onClick={onClose}
                className="w-full text-gray-400 font-medium text-xs text-center pt-4 hover:text-gray-600 transition-colors"
              >
                Continuar tentando por aqui
              </button>

              <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-gray-400">
                <span>🔒 Conversa segura</span>
                <span>•</span>
                <span>⚡ Resposta rápida</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  const pct = (left / seconds) * 100;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-full h-1.5 bg-green-100 rounded-full overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-green-500"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>
      <p className="text-xs text-gray-400">
        Código expira em <span className={`font-bold tabular-nums ${left < 120 ? "text-red-500" : "text-gray-600"}`}>{m}:{s}</span>
      </p>
    </div>
  );
}

function fireTrackingEvents(amount: number, productName: string) {
  try {
    const fbq = (window as unknown as Record<string, unknown>).fbq as ((...a: unknown[]) => void) | undefined;
    if (typeof fbq === "function") {
      fbq("track", "Purchase", {
        value: amount,
        currency: "BRL",
        content_name: productName,
        content_type: "product",
      });
    }
  } catch { /* silently ignore */ }

  try {
    const utmify = (window as unknown as Record<string, unknown>).utmify as ((...a: unknown[]) => void) | undefined;
    if (typeof utmify === "function") {
      utmify("track", "Purchase", {
        value: amount,
        currency: "BRL",
        content_name: productName,
      });
    }
  } catch { /* silently ignore */ }
}

const MAX_POLLS = 72;

export default function Success() {
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const payment = params.get("payment") || "pix";
  const fromDeclined = params.get("from") === "declined";

  const [phase, setPhase] = useState<Phase>("loading");
  const [showParticles, setShowParticles] = useState(false);
  const [copied, setCopied] = useState(false);

  const [pixData, setPixData] = useState<PixData | null>(null);
  const pixAttempts = loadPixAttempts();
  const [helpOpen, setHelpOpen] = useState(false);

  // Abre o popup de ajuda automaticamente após 3+ tentativas (PIX ou cartão)
  useEffect(() => {
    if (phase !== "content") return;
    const eligible = payment === "card" ? loadCardAttempts() >= 3 : pixAttempts >= 3;
    if (!eligible) return;
    const t = setTimeout(() => setHelpOpen(true), 1800);
    return () => clearTimeout(t);
  }, [phase, payment, pixAttempts]);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState(49.0);
  const [orderProductName, setOrderProductName] = useState("Kit Álbum Copa Do Mundo 2026");

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const hasFetched = useRef(false);
  const trackingFired = useRef(false);
  const pixGeneratedFired = useRef(false);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("checkoutData");
    if (raw) {
      try {
        const cd = JSON.parse(raw) as { amount?: number; productName?: string };
        if (cd.amount && cd.amount > 0) setOrderAmount(cd.amount);
        if (cd.productName) setOrderProductName(cd.productName);
      } catch { /* ignored */ }
    }
  }, []);

  useEffect(() => {
    const delay = payment === "card" ? 3000 : 2000;
    const t1 = setTimeout(() => { setPhase("reveal"); setShowParticles(true); }, delay);
    const t2 = setTimeout(() => setPhase("content"), delay + 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [payment]);

  // PIX: lê do sessionStorage (gerado no checkout via gateway)
  useEffect(() => {
    if (payment !== "pix" || hasFetched.current) return;
    hasFetched.current = true;

    const stored = loadPixFromStorage();
    if (stored) {
      setPixData(stored);
      return;
    }

    // Fallback: tenta chamar o gateway diretamente
    async function gen() {
      setPixLoading(true);
      setPixError(null);
      try {
        const raw = sessionStorage.getItem("checkoutData");
        if (!raw) throw new Error("Dados não encontrados. Reinicie a compra.");
        const checkoutData = JSON.parse(raw) as Record<string, unknown>;
        const res = await fetch("/api/pix/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkoutData),
        });
        const data = await res.json() as {
          transactionId?: string;
          pixCode?: string;
          qrCodeBase64?: string;
          qrCodeImage?: string;
          error?: string;
        };
        if (!res.ok || !data.pixCode) {
          throw new Error(data.error || "Erro ao gerar PIX.");
        }
        const result: PixData = {
          transactionId: data.transactionId || "",
          pixCode: data.pixCode,
          qrCodeBase64: data.qrCodeBase64 || undefined,
          qrCodeImage: data.qrCodeImage || undefined,
        };
        setPixData(result);
        sessionStorage.setItem("pixResult", JSON.stringify(result));
      } catch (e) {
        setPixError(e instanceof Error ? e.message : "Erro ao gerar PIX.");
      } finally {
        setPixLoading(false);
      }
    }
    gen();
  }, [payment]);

  // Polling de status do pagamento via gateway
  useEffect(() => {
    if (payment !== "pix" || !pixData?.transactionId) return;

    function startPolling() {
      pollInterval.current = setInterval(async () => {
        pollCount.current += 1;
        if (pollCount.current > MAX_POLLS) {
          if (pollInterval.current) clearInterval(pollInterval.current);
          return;
        }
        try {
          const res = await fetch(`/api/pix/status?id=${pixData!.transactionId}`);
          const data = await res.json() as { status?: string };
          if (data.status === "paid" || data.status === "approved") {
            if (pollInterval.current) clearInterval(pollInterval.current);
            if (!trackingFired.current) {
              trackingFired.current = true;
              fireTrackingEvents(orderAmount, orderProductName);
            }
            clearCart();
            setPaymentConfirmed(true);
          }
        } catch { /* ignored */ }
      }, 5000);
    }

    startPolling();
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [pixData, orderAmount, orderProductName, payment]);

  // pix_generated — dispara uma vez quando o QR Code é exibido
  useEffect(() => {
    if (!pixData || pixGeneratedFired.current) return;
    pixGeneratedFired.current = true;
    pushEcommerceEvent("pix_generated", {
      transaction_id: pixData.transactionId || "",
      currency: "BRL",
      value: orderAmount,
      payment_type: "pix",
      items: [
        {
          item_id: "topmix_order",
          item_name: orderProductName,
          price: orderAmount,
          quantity: 1,
        },
      ],
    }, {
      event_id: (pixData.transactionId || "pix") + "_pix_generated",
    });
  }, [pixData, orderAmount, orderProductName]);

  async function handleRetry() {
    setPixData(null);
    setPixError(null);
    sessionStorage.removeItem("pixResult");
    hasFetched.current = false;
    setPixLoading(true);
    try {
      const raw = sessionStorage.getItem("checkoutData");
      if (!raw) throw new Error("Dados não encontrados. Reinicie a compra.");
      const checkoutData = JSON.parse(raw) as Record<string, unknown>;
      const res = await fetch("/api/pix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutData),
      });
      const data = await res.json() as {
        transactionId?: string;
        pixCode?: string;
        qrCodeBase64?: string;
        qrCodeImage?: string;
        error?: string;
      };
      if (!res.ok || !data.pixCode) {
        throw new Error(data.error || "Erro ao gerar PIX.");
      }
      const result: PixData = {
        transactionId: data.transactionId || "",
        pixCode: data.pixCode,
        qrCodeBase64: data.qrCodeBase64 || undefined,
        qrCodeImage: data.qrCodeImage || undefined,
      };
      setPixData(result);
      sessionStorage.setItem("pixResult", JSON.stringify(result));
    } catch (e) {
      setPixError(e instanceof Error ? e.message : "Erro ao gerar PIX.");
    } finally {
      setPixLoading(false);
    }
  }

  async function handleCopy() {
    if (!pixData?.pixCode) return;
    try { await navigator.clipboard.writeText(pixData.pixCode); } catch { /* ignored */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function handlePayWithPix() {
    const pixAmount = parseFloat((orderAmount * 0.9).toFixed(2));
    const rawData = sessionStorage.getItem("checkoutData");
    if (rawData) {
      try {
        const cd = JSON.parse(rawData) as Record<string, unknown>;
        cd.amount = pixAmount;
        sessionStorage.setItem("checkoutData", JSON.stringify(cd));
      } catch { /* ignored */ }
    }
    const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL?.replace(/\/$/, "") ?? "";
    window.location.href = `${base}/sucesso?payment=pix&from=declined`;
  }

  // ── Tela de pagamento confirmado ──────────────────────────────────────────
  if (paymentConfirmed) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-white flex flex-col items-center justify-center p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "backOut" }}
            className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-xl shadow-green-200"
          >
            <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h1 className="text-2xl font-black text-gray-900 mb-2">Pagamento Confirmado! 🎉</h1>
            <p className="text-gray-500 text-base leading-relaxed max-w-xs mx-auto">
              Seu pedido foi aprovado e está sendo preparado para envio.
            </p>
            <p className="text-green-700 font-bold text-lg mt-3">
              R$ {orderAmount.toFixed(2).replace(".", ",")}
            </p>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            onClick={() => setLocation("/")}
            className="mt-8 px-8 py-3.5 rounded-xl text-white font-bold text-base shadow-md hover:opacity-90 active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}
          >
            Voltar à loja
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Tela de loading ───────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-6 select-none" style={{ caretColor: "transparent" }} tabIndex={-1}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-green-100 border-t-green-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <PixIcon size={28} />
            </div>
          </div>
          <p className="text-base font-semibold text-gray-700">
            {payment === "card" ? "Processando pagamento..." : "Preparando seu pedido..."}
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Animação reveal ───────────────────────────────────────────────────────
  if (phase === "reveal") {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center overflow-hidden select-none" style={{ caretColor: "transparent" }} tabIndex={-1}>
        <RippleRings color="#22c55e" />
        {showParticles && <ParticleBurst color="#22c55e" />}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "backOut" }}
          className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center z-10 shadow-lg shadow-green-200"
        >
          <PixIcon size={38} />
        </motion.div>
      </div>
    );
  }

  // ── Tela de cartão recusado ───────────────────────────────────────────────
  if (payment === "card") {
    const rawCard = typeof window !== "undefined" ? sessionStorage.getItem("cardData") : null;
    const card = rawCard
      ? (() => { try { return JSON.parse(rawCard) as { bank?: { name?: string }; last4?: string }; } catch { return null; } })()
      : null;
    const bankName = card?.bank?.name || "Cartão";
    const last4 = card?.last4 || "****";

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="bg-white rounded-2xl border border-gray-200 shadow-md w-full max-w-md overflow-hidden"
          >
            <div className="h-1.5 w-full" style={{ background: "#E09400" }} />
            <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full border-2 border-yellow-400 flex items-center justify-center bg-yellow-50">
                  <CreditCard className="w-8 h-8 text-yellow-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-2 border-white">
                  <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">Pagamento não autorizado</p>
              <h1 className="text-xl font-bold text-gray-900 leading-snug mb-1">
                Não foi possível processar com cartão
              </h1>
              <p className="text-sm text-gray-400">{bankName} **** {last4}</p>
            </div>
            <div className="px-6 pb-8 space-y-3">
              <p className="text-sm text-gray-600 text-center leading-relaxed mb-2">
                Seu banco não autorizou o pagamento de{" "}
                <strong>R$ {orderAmount.toFixed(2).replace(".", ",")}</strong>.<br />
                Pague via Pix agora — mais rápido e com{" "}
                <strong className="text-green-700">10% de desconto</strong>!
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-green-700 font-semibold">
                  Valor com desconto Pix:&nbsp;
                  <span className="text-base font-black text-green-700">
                    R$ {(orderAmount * 0.9).toFixed(2).replace(".", ",")}
                  </span>
                </p>
              </div>
              <button
                onClick={handlePayWithPix}
                className="w-full h-12 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}
              >
                <PixIcon size={22} />
                Pagar via Pix agora
              </button>
              <button
                onClick={() => setLocation("/checkout?pagamento=cartao")}
                className="w-full h-11 rounded-xl border-2 border-gray-200 text-gray-700 font-medium text-sm"
              >
                Tentar outro cartão
              </button>
              <WhatsAppHelpModal
                open={helpOpen}
                onClose={() => setHelpOpen(false)}
                href={whatsappCardHelpLink(last4)}
                title="Cartão recusado de novo?"
                text="Percebemos que seu banco não autorizou o pagamento mais de uma vez. Isso é mais comum do que parece — me chame no WhatsApp que eu te explico o motivo e resolvo com você agora mesmo, sem compromisso."
              />
              <button
                onClick={() => setLocation("/")}
                className="w-full text-gray-400 font-medium text-sm text-center py-1"
              >
                Cancelar compra
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Tela PIX ──────────────────────────────────────────────────────────────
  function buildQrSrc(b64?: string, img?: string): string | null {
    if (b64) {
      if (b64.startsWith("data:") || b64.startsWith("http")) return b64;
      return `data:image/png;base64,${b64}`;
    }
    return img || null;
  }
  const qrSrc = buildQrSrc(pixData?.qrCodeBase64, pixData?.qrCodeImage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-10"
    >
      {/* Top banner */}
      <div className="bg-green-500 px-4 pt-8 pb-10 flex flex-col items-center text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: "backOut" }}
          className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mb-4 backdrop-blur-sm"
        >
          <PixIcon size={34} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {fromDeclined && (
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold mb-2 inline-block">
              ✓ Desconto de 10% aplicado
            </span>
          )}
          <h1 className="text-xl font-black leading-tight">
            Pague via Pix para<br />concluir seu pedido
          </h1>
          <p className="text-green-100 text-sm mt-1 font-medium">
            R$ {orderAmount.toFixed(2).replace(".", ",")} • Aprovação na hora
          </p>
        </motion.div>
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
        className="max-w-md mx-auto px-4 -mt-5"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Steps */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Como pagar</p>
            <ol className="space-y-2">
              {[
                "Abra o app do seu banco e acesse o Pix",
                "Escaneie o QR Code ou use o código Copia e Cola abaixo",
                "Confirme o valor e conclua o pagamento",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-600 leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* QR Code / Loading / Error */}
          <div className="px-5 py-5">
            {pixLoading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-green-100 border-t-green-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PixIcon size={20} />
                  </div>
                </div>
                <p className="text-sm text-gray-500 font-medium">Gerando código PIX...</p>
              </div>
            )}

            {pixError && !pixLoading && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 leading-relaxed">{pixError}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="w-full h-11 rounded-xl border-2 border-gray-200 text-gray-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar novamente
                </button>
              </div>
            )}

            {pixData && !pixLoading && (
              <div className="space-y-4">
                {/* Status indicator */}
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                  <p className="text-xs text-amber-700 font-medium">Aguardando confirmação do pagamento...</p>
                </div>

                {/* QR Code */}
                {qrSrc && (
                  <div className="flex flex-col items-center">
                    <div className="border-2 border-green-100 rounded-2xl p-3 bg-white shadow-sm inline-block">
                      <img src={qrSrc} alt="QR Code PIX" className="w-52 h-52 object-contain" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 font-medium">Escaneie com a câmera do banco</p>
                  </div>
                )}

                {/* Pix code box */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Pix Copia e Cola</p>
                  <p className="text-xs font-mono text-gray-500 break-all leading-relaxed line-clamp-3 select-all">
                    {pixData.pixCode}
                  </p>
                </div>

                {/* Countdown */}
                <Countdown seconds={30 * 60} />

                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="w-full h-13 py-3.5 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-green-200"
                  style={{ background: copied ? "#16a34a" : "linear-gradient(135deg, #22c55e, #16a34a)" }}
                >
                  {copied
                    ? <><CheckCheck className="w-5 h-5" /> Código copiado!</>
                    : <><Copy className="w-5 h-5" /> Copiar código Pix</>}
                </button>

                <WhatsAppHelpModal
                  open={helpOpen}
                  onClose={() => setHelpOpen(false)}
                  href={whatsappHelpLink()}
                  title="Não está conseguindo pagar o Pix?"
                  text="Alguns bancos mostram avisos no Pix que assustam, mas seu pedido está certinho. Me chame no WhatsApp que eu te explico na hora e te ajudo a finalizar o pagamento com segurança."
                />

                <button
                  onClick={() => setLocation("/")}
                  className="w-full text-gray-400 font-medium text-sm text-center py-1 hover:text-gray-600 transition-colors"
                >
                  Voltar à loja
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-gray-400">
          <span className="flex items-center gap-1">🔒 Ambiente seguro</span>
          <span>•</span>
          <span className="flex items-center gap-1">⚡ Aprovação imediata</span>
          <span>•</span>
          <span className="flex items-center gap-1">📱 Qualquer banco</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
