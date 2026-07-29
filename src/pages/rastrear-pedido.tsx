// ─────────────────────────────────────────────────────────────────────────────
// rastrear-pedido.tsx — TopMix Brasil
//
// Fluxo de 15 dias. No dia 15 aparece o botão de taxa de reenvio.
// Todo o fluxo de pagamento (QR Pix → upload comprovante → confirmação)
// acontece dentro de um único popup sem sair da página.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  Search, Package, Truck, CheckCircle, ShieldCheck,
  ChevronRight, ArrowLeft, MapPin, Box, AlertTriangle,
  RotateCcw, Warehouse, CreditCard, Copy, CheckCheck,
  X, Clock, Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Ícone PIX inline ─────────────────────────────────────────────────────────
const PixIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 512 512" width={size} height={size} fill="none" className={className}>
    <path d="M112.57 391.19c20.056 0 38.928-7.808 53.12-22l76.693-76.692c5.385-5.386 14.765-5.373 20.136 0l76.989 76.989c14.192 14.192 33.064 22 53.12 22h15.138l-97.2 97.2c-30.418 30.417-79.73 30.417-110.148 0l-97.49-97.497h10.642z" fill="currentColor"/>
    <path d="M112.57 120.81c20.056 0 38.928 7.808 53.12 22l76.693 76.692c5.565 5.566 14.57 5.566 20.136 0l76.989-76.989c14.192-14.192 33.064-22 53.12-22h10.642l-97.49-97.49c-30.418-30.417-79.73-30.417-110.148 0l-97.2 97.2 14.138-.413z" fill="currentColor"/>
    <path d="M458.783 200.643l-54.36-54.36h-11.795c-14.14 0-27.68 5.62-37.667 15.606l-76.989 76.989c-13.693 13.693-37.438 13.706-51.144 0l-76.693-76.692c-9.987-9.987-23.527-15.607-37.667-15.607H97.327l-54.11 54.11c-30.418 30.417-30.418 79.73 0 110.147l54.11 54.111h15.141c14.14 0 27.68-5.62 37.667-15.607l76.693-76.692c6.924-6.924 15.983-10.387 25.572-10.387 9.588 0 18.648 3.463 25.572 10.387l76.989 76.989c9.987 9.987 23.527 15.607 37.667 15.607h11.795l54.36-54.361c30.417-30.417 30.417-79.73 0-110.24z" fill="currentColor"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " — " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}
function fmtPrev(d: Date) {
  return `Previsão: ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}
function addH(base: Date, h: number) {
  return new Date(base.getTime() + h * 3_600_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFSETS (horas a partir de origem_at)
// ─────────────────────────────────────────────────────────────────────────────
const H = {
  SEPARACAO:   2,
  EMBALAGEM:   26,
  ENVIADO:     50,
  TRANSITO1:   98,
  TRANSITO2:   146,
  SAIU:        194,
  FALHA:       254,
  RETORNANDO:  274,
  CD:          302,
  AGUARDANDO:  322,
  TAXA:        360,   // dia 15 — botão de taxa aparece
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

interface Etapa {
  icone: React.ComponentType<{ className?: string }>;
  label: string;
  descricao: string;
  data: string;
  ok: boolean;
  erro: boolean;
  taxa?: boolean;
}

interface ResultadoRastreio {
  etapas: Etapa[];
  previsao: string;
  status: string;
  falhaEntrega: boolean;
  aguardandoTaxa: boolean;
}

interface TaxaPixData {
  pixCode: string;
  qrCodeImage: string | null;
  qrCodeBase64: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GERADOR DE ETAPAS
// ─────────────────────────────────────────────────────────────────────────────

function gerarEtapas(origem: Date): ResultadoRastreio {
  const agora = new Date();
  const h = (agora.getTime() - origem.getTime()) / 3_600_000;

  const t = {
    separacao:  addH(origem, H.SEPARACAO),
    embalagem:  addH(origem, H.EMBALAGEM),
    enviado:    addH(origem, H.ENVIADO),
    transito1:  addH(origem, H.TRANSITO1),
    transito2:  addH(origem, H.TRANSITO2),
    saiu:       addH(origem, H.SAIU),
    falha:      addH(origem, H.FALHA),
    retornando: addH(origem, H.RETORNANDO),
    cd:         addH(origem, H.CD),
    aguardando: addH(origem, H.AGUARDANDO),
    taxa:       addH(origem, H.TAXA),
  };

  const previsaoOriginal = addH(origem, 9 * 24);

  const etapas: Etapa[] = [
    {
      icone: CheckCircle,
      label: "Pedido Confirmado",
      descricao: "Pagamento recebido. Seu pedido foi registrado com sucesso no sistema.",
      data: fmt(origem), ok: true, erro: false,
    },
    {
      icone: Box,
      label: "Em Separação",
      descricao: "Produto em separação no estoque — Guarulhos, SP.",
      data: h >= H.SEPARACAO ? fmt(t.separacao) : fmtPrev(t.separacao),
      ok: h >= H.SEPARACAO, erro: false,
    },
    {
      icone: Package,
      label: "Em Embalagem",
      descricao: "O kit está sendo embalado com cuidado para garantir que chegue em perfeito estado.",
      data: h >= H.EMBALAGEM ? fmt(t.embalagem) : fmtPrev(t.embalagem),
      ok: h >= H.EMBALAGEM, erro: false,
    },
    {
      icone: Truck,
      label: "Coletado pela Transportadora",
      descricao: "Pedido coletado e despachado — partindo de Guarulhos, SP.",
      data: h >= H.ENVIADO ? fmt(t.enviado) : fmtPrev(t.enviado),
      ok: h >= H.ENVIADO, erro: false,
    },
    {
      icone: Truck,
      label: "Em Trânsito",
      descricao: "Objeto em trânsito — Centro de Triagem Nacional.",
      data: h >= H.TRANSITO1 ? fmt(t.transito1) : fmtPrev(t.transito1),
      ok: h >= H.TRANSITO1, erro: false,
    },
    {
      icone: Truck,
      label: "Em Trânsito",
      descricao: "Objeto em rota para a unidade de distribuição de destino.",
      data: h >= H.TRANSITO2 ? fmt(t.transito2) : fmtPrev(t.transito2),
      ok: h >= H.TRANSITO2, erro: false,
    },
    {
      icone: MapPin,
      label: "Saiu para Entrega",
      descricao: "O pedido está com o entregador e será entregue em breve.",
      data: h >= H.SAIU ? fmt(t.saiu) : fmtPrev(previsaoOriginal),
      ok: h >= H.SAIU, erro: false,
    },
  ];

  if (h >= H.FALHA) etapas.push({
    icone: AlertTriangle,
    label: "Falha na Tentativa de Entrega",
    descricao: "A transportadora tentou realizar a entrega, mas não localizou nenhum responsável no endereço. O objeto está retornando ao Centro de Distribuição.",
    data: fmt(t.falha), ok: false, erro: true,
  });

  if (h >= H.RETORNANDO) etapas.push({
    icone: RotateCcw,
    label: "Em Trânsito — Retornando ao CD",
    descricao: "O objeto está a caminho do Centro de Distribuição — Guarulhos, SP.",
    data: fmt(t.retornando), ok: true, erro: false,
  });

  if (h >= H.CD) etapas.push({
    icone: Warehouse,
    label: "Chegou ao Centro de Distribuição",
    descricao: "Objeto recebido no CD — Guarulhos, SP. Aguardando instrução do destinatário.",
    data: fmt(t.cd), ok: true, erro: false,
  });

  if (h >= H.AGUARDANDO) etapas.push({
    icone: Clock,
    label: "Aguardando Instrução do Destinatário",
    descricao: "O objeto permanece retido no Centro de Distribuição. É necessária uma ação do destinatário para liberar o reenvio.",
    data: fmt(t.aguardando), ok: false, erro: false,
  });

  if (h >= H.TAXA) etapas.push({
    icone: CreditCard,
    label: "Aguardando Taxa de Reenvio",
    descricao: "Para que seu pedido seja reenviado, é necessário o pagamento da taxa de reenvio. Após a confirmação, entrega em até 2 dias úteis.",
    data: fmt(t.taxa), ok: false, erro: false, taxa: true,
  });

  let status: string;
  if      (h >= H.TAXA)       status = "⚠️ Taxa de Reenvio";
  else if (h >= H.AGUARDANDO) status = "🕐 Aguardando Instrução";
  else if (h >= H.CD)         status = "🏭 No Centro de Distribuição";
  else if (h >= H.RETORNANDO) status = "🔄 Retornando ao CD";
  else if (h >= H.FALHA)      status = "❌ Falha na Entrega";
  else if (h >= H.SAIU)       status = "🚚 Saiu para Entrega";
  else if (h >= H.TRANSITO2)  status = "🚛 Em Trânsito";
  else if (h >= H.TRANSITO1)  status = "🚛 Em Trânsito";
  else if (h >= H.ENVIADO)    status = "📦 Enviado";
  else if (h >= H.EMBALAGEM)  status = "📦 Em Embalagem";
  else if (h >= H.SEPARACAO)  status = "🔍 Em Separação";
  else                        status = "✅ Confirmado";

  return {
    etapas,
    previsao: previsaoOriginal.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    status,
    falhaEntrega:   h >= H.FALHA,
    aguardandoTaxa: h >= H.TAXA,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────────────────────────────────────

async function getDadosPedido(codigo: string) {
  const [origemRes, leadRes] = await Promise.all([
    supabase.from("rastreio_origem").select("origem_at").eq("codigo", codigo).maybeSingle(),
    supabase.from("leads").select("nome").eq("codigo_rastreio", codigo).maybeSingle(),
  ]);
  if (!origemRes.data?.origem_at) return null;
  return {
    origem:      new Date(origemRes.data.origem_at),
    nomeCliente: leadRes.data?.nome ?? "",
  };
}

function codigoValido(cod: string) {
  return /^TM[A-Z0-9]{6,10}$/i.test(cod.trim().replace(/[-\s]/g, ""));
}

function buildQrSrc(b64?: string | null, img?: string | null) {
  if (b64) return b64.startsWith("data:") || b64.startsWith("http") ? b64 : `data:image/png;base64,${b64}`;
  return img || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POPUP DE TAXA — componente interno
// ─────────────────────────────────────────────────────────────────────────────
// Etapas internas:
//   "pix"         → QR Code gerado + botão copiar + botão "Já paguei"
//   "comprovante" → área de upload
//   "confirmado"  → tela de sucesso (fecha após 3s)

type PopupStep = "pix" | "comprovante" | "confirmado";

interface TaxaPopupProps {
  nomeCliente: string;
  codigoRastreio: string;
  onConfirmado: () => void;
  onFechar: () => void;
}

function TaxaPopup({ nomeCliente, codigoRastreio, onConfirmado, onFechar }: TaxaPopupProps) {
  const [step, setStep]       = useState<PopupStep>("pix");
  const [pix, setPix]         = useState<TaxaPixData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixErro, setPixErro] = useState("");
  const [copied, setCopied]   = useState(false);

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadErro, setUploadErro]       = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  // Gera o Pix ao montar o popup
  useState(() => {
    (async () => {
      setPixLoading(true);
      try {
        const res = await fetch("/api/pix/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 9.00,
            name: nomeCliente || "Cliente TopMix",
            productName: `Taxa de Reenvio — ${codigoRastreio}`,
          }),
        });
        const data = await res.json() as {
          pixCode?: string; qrCodeBase64?: string; qrCodeImage?: string; error?: string;
        };
        if (!res.ok || !data.pixCode) throw new Error(data.error || "Erro ao gerar Pix.");
        setPix({ pixCode: data.pixCode, qrCodeBase64: data.qrCodeBase64 || null, qrCodeImage: data.qrCodeImage || null });
      } catch (e) {
        setPixErro(e instanceof Error ? e.message : "Erro ao gerar Pix.");
      } finally {
        setPixLoading(false);
      }
    })();
  });

  async function copiar() {
    if (!pix?.pixCode) return;
    try { await navigator.clipboard.writeText(pix.pixCode); } catch { /* ok */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function enviarComprovante(file: File) {
    // Confirma imediatamente — sem depender do upload terminar
    setStep("confirmado");
    setTimeout(() => {
      onConfirmado();
      onFechar();
    }, 3000);

    // Sobe o arquivo pro Supabase em segundo plano (fire-and-forget)
    const ext  = file.name.split(".").pop() || "jpg";
    const path = `${codigoRastreio}/${Date.now()}.${ext}`;
    supabase.storage.from("comprovantes").upload(path, file, { upsert: true }).then(({ data }) => {
      if (!data) return;
      const { data: urlData } = supabase.storage.from("comprovantes").getPublicUrl(path);
      supabase.from("comprovantes_taxa").insert({
        tracking_code: codigoRastreio,
        file_url:      urlData.publicUrl,
        file_name:     file.name,
      });
    });
  }

  const qrSrc = buildQrSrc(pix?.qrCodeBase64, pix?.qrCodeImage);
  const podFechar = step !== "confirmado" && !uploadLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
      onClick={e => { if (podFechar && e.target === e.currentTarget) onFechar(); }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-5 pt-5 pb-4 shrink-0 ${
          step === "confirmado" ? "bg-green-600" : "bg-white"
        }`}>
          {step === "pix" && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                <PixIcon size={16} className="text-green-600" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm leading-tight">Pagar Taxa de Reenvio</p>
                <p className="text-xs text-gray-400">Pix • R$ 9,00</p>
              </div>
            </div>
          )}
          {step === "comprovante" && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <Upload className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm leading-tight">Confirmar Pagamento</p>
                <p className="text-xs text-gray-400">Envie o comprovante do Pix</p>
              </div>
            </div>
          )}
          {step === "confirmado" && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <CheckCheck className="h-4 w-4 text-white" />
              </div>
              <p className="font-black text-white text-sm">Pagamento Confirmado!</p>
            </div>
          )}

          {podFechar && (
            <button
              onClick={onFechar}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Indicador de etapas */}
        {step !== "confirmado" && (
          <div className="flex gap-1.5 px-5 pb-3 shrink-0">
            {(["pix", "comprovante"] as const).map((s, i) => (
              <div
                key={s}
                className={`h-1 rounded-full flex-1 transition-all ${step === s ? "bg-green-500" : i < ["pix","comprovante"].indexOf(step) ? "bg-green-300" : "bg-gray-200"}`}
              />
            ))}
          </div>
        )}

        {/* ── Conteúdo ───────────────────────────────────────────────────── */}
        <div className="overflow-y-auto px-5 pb-6 flex-1">

          {/* ETAPA 1 — QR Code Pix */}
          {step === "pix" && (
            <div className="space-y-4">
              {pixLoading ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                    <div className="w-7 h-7 border-[3px] border-green-200 border-t-green-600 rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-gray-500 font-semibold">Gerando Pix...</p>
                </div>
              ) : pixErro ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 text-center">
                  {pixErro}
                  <button
                    className="block mt-2 text-xs font-bold text-red-700 underline mx-auto"
                    onClick={() => { setPixErro(""); setPixLoading(true); }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : pix ? (
                <>
                  {/* Valor */}
                  <div className="bg-green-50 border border-green-200 rounded-xl py-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Taxa de reenvio</p>
                    <p className="text-3xl font-black text-green-700">R$ 9,00</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      ✅ Entrega garantida em até <strong>2 dias úteis</strong> após confirmação
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-2">
                    {qrSrc ? (
                      <div className="p-3 bg-white border-2 border-green-200 rounded-2xl shadow-sm">
                        <img src={qrSrc} alt="QR Code Pix" className="w-44 h-44 object-contain" />
                      </div>
                    ) : (
                      <div className="w-44 h-44 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <PixIcon size={56} className="text-green-500" />
                      </div>
                    )}
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <PixIcon size={12} className="text-green-500" /> Escaneie com o app do seu banco
                    </p>
                  </div>

                  {/* Copia e cola */}
                  <div>
                    <p className="text-xs text-gray-500 font-bold mb-1.5 text-center">Ou copie o código Pix:</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-600 truncate">
                        {pix.pixCode}
                      </div>
                      <button
                        onClick={copiar}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black text-white transition-all hover:opacity-90 active:scale-95"
                        style={{ background: copied ? "#15803d" : "linear-gradient(135deg,#15803d,#22c55e)" }}
                      >
                        {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>

                  {/* Botão "já paguei" */}
                  <button
                    onClick={() => setStep("comprovante")}
                    className="w-full py-3 rounded-xl border-2 border-green-500 text-green-700 font-black text-sm hover:bg-green-50 transition-all"
                  >
                    ✅ Já paguei — enviar comprovante
                  </button>

                  <p className="text-[11px] text-gray-400 text-center">
                    Após o pagamento, clique em "Já paguei" e envie o comprovante.<br/>
                    Seu reenvio é confirmado na hora.
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* ETAPA 2 — Upload do comprovante */}
          {step === "comprovante" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Envie o <strong>comprovante do Pix</strong> de R$ 9,00. Assim que recebermos, seu pedido é
                despachado com prioridade e chega em até <strong>2 dias úteis</strong>.
              </p>

              {uploadLoading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                    <div className="w-7 h-7 border-[3px] border-green-200 border-t-green-600 rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-gray-500 font-semibold">Enviando comprovante...</p>
                </div>
              ) : (
                <>
                  {/* Área de upload — clica ou arrasta */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) enviarComprovante(file);
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 w-full py-8 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 hover:bg-green-100 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-green-700" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-800 font-black">Toque para anexar comprovante</p>
                      <p className="text-xs text-gray-400 mt-1">Print, foto ou PDF • qualquer formato</p>
                    </div>
                  </button>

                  {uploadErro && (
                    <p className="text-xs text-red-500 text-center bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      {uploadErro}
                    </p>
                  )}

                  {/* Voltar para o QR */}
                  <button
                    onClick={() => setStep("pix")}
                    className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center gap-1"
                  >
                    ← Voltar ao QR Code
                  </button>
                </>
              )}
            </div>
          )}

          {/* ETAPA 3 — Confirmado */}
          {step === "confirmado" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                <CheckCheck className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xl">Comprovante recebido!</p>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                  Seu reenvio foi aprovado. O pedido será despachado com prioridade e chegará em até{" "}
                  <strong className="text-green-700">2 dias úteis</strong>.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 w-full">
                <div className="flex items-center gap-2 justify-center text-green-700">
                  <Truck className="h-4 w-4" />
                  <span className="text-sm font-bold">Acompanhe o reenvio na linha do tempo abaixo</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function RastrearPedido() {
  const [codigo, setCodigo]   = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");

  const [resultado, setResultado]         = useState<ResultadoRastreio | null>(null);
  const [codigoExibido, setCodigoExibido] = useState("");
  const [nomeCliente, setNomeCliente]     = useState("");
  const [origemAt, setOrigemAt]           = useState<Date | null>(null);

  // Popup de taxa
  const [showPopup, setShowPopup]     = useState(false);
  const [taxaPaga, setTaxaPaga]       = useState(false);
  const [pagoPem, setPagoPem]         = useState<Date | null>(null); // quando o comprovante foi enviado

  async function handleRastrear(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const cod = codigo.trim();
    if (!cod) return;
    if (!codigoValido(cod)) {
      setErro("Código inválido. Use o código enviado pela Top Mix, ex: TM2A3B4C5D");
      return;
    }
    setLoading(true);
    try {
      const dados = await getDadosPedido(cod.toUpperCase());
      if (!dados) {
        setErro("Código não encontrado. Verifique o código enviado pela Top Mix e tente novamente.");
        return;
      }
      setCodigoExibido(cod.toUpperCase());
      setNomeCliente(dados.nomeCliente);
      setOrigemAt(dados.origem);
      setResultado(gerarEtapas(dados.origem));
    } catch {
      setErro("Erro ao buscar o rastreio. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleTaxaConfirmada() {
    setTaxaPaga(true);
    setPagoPem(new Date());
  }

  const primeiroNome = nomeCliente
    ? nomeCliente.split(" ")[0].charAt(0).toUpperCase() + nomeCliente.split(" ")[0].slice(1).toLowerCase()
    : "";

  // Timeline do reenvio (aparece após pagar a taxa)
  function EtapasReenvio() {
    if (!taxaPaga || !pagoPem) return null;
    const agora = new Date();
    const min   = (agora.getTime() - pagoPem.getTime()) / 60_000;

    const tSep      = new Date(pagoPem.getTime() + 2  * 3_600_000);
    const tSaiu     = new Date(pagoPem.getTime() + 24 * 3_600_000);
    const tEntregue = new Date(pagoPem.getTime() + 48 * 3_600_000);

    const etapas = [
      {
        icone: CheckCheck,
        label: "Taxa de Reenvio Confirmada",
        descricao: "Pagamento recebido. Reenvio aprovado com prioridade.",
        data: fmt(pagoPem), ok: true,
      },
      {
        icone: Package,
        label: "Em Separação para Reenvio",
        descricao: "Seu pedido está sendo separado e embalado para novo despacho — Guarulhos, SP.",
        data: min >= 120 ? fmt(tSep) : fmtPrev(tSep),
        ok: min >= 120,
      },
      {
        icone: Truck,
        label: "Saiu para Entrega",
        descricao: "Pedido despachado! O entregador está a caminho do seu endereço.",
        data: min >= 1440 ? fmt(tSaiu) : fmtPrev(tSaiu),
        ok: min >= 1440,
      },
      {
        icone: CheckCircle,
        label: primeiroNome ? `Entregue a ${primeiroNome}` : "Entregue",
        descricao: "Seu Kit Copa 2026 foi entregue com sucesso. Obrigado pela confiança! 🎉",
        data: min >= 2880 ? fmt(tEntregue) : fmtPrev(tEntregue),
        ok: min >= 2880,
      },
    ];

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-200 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <Truck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-base">Reenvio em Andamento</h3>
            <p className="text-xs text-green-600 font-semibold">
              Previsão: {tEntregue.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} — até 2 dias úteis
            </p>
          </div>
        </div>
        {etapas.map((et, i) => {
          const Icon   = et.icone;
          const isLast = i === etapas.length - 1;
          return (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 ${et.ok ? "bg-green-500" : "bg-gray-200"}`}>
                  <Icon className={`h-4 w-4 ${et.ok ? "text-white" : "text-gray-400"}`} />
                </div>
                {!isLast && <div className={`w-0.5 flex-1 my-1 ${et.ok ? "bg-green-300" : "bg-gray-200"}`} style={{ minHeight: 28 }} />}
              </div>
              <div className="pb-5">
                <p className={`text-sm font-bold ${et.ok ? "text-gray-900" : "text-gray-400"}`}>{et.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{et.descricao}</p>
                <p className={`text-xs mt-0.5 font-semibold ${et.ok ? "text-green-600" : "text-gray-400"}`}>{et.data}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar à Loja
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Rastrear Pedido</h1>
          <p className="text-sm text-gray-500 mt-1">Digite o código enviado pela Top Mix para acompanhar sua entrega.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Formulário de busca */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <form onSubmit={handleRastrear} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={codigo}
                onChange={e => { setCodigo(e.target.value); setErro(""); }}
                placeholder="Ex: TM2A3B4C5D"
                className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${erro ? "border-red-400" : "border-gray-200"}`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl font-black text-sm text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#15803d,#22c55e)" }}
            >
              {loading ? "Buscando..." : "RASTREAR"}
            </button>
          </form>
          {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}
        </div>

        {resultado && (
          <>
            {/* Alerta de falha na entrega */}
            {resultado.falhaEntrega && (
              <div className="bg-red-50 border border-red-300 rounded-2xl p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-black text-red-700 text-sm">Falha na Tentativa de Entrega</p>
                  <p className="text-red-600 text-xs mt-1 leading-relaxed">
                    A transportadora tentou realizar a entrega, mas não localizou nenhum responsável no
                    endereço. O produto está retornando ao CD em <strong>Guarulhos, SP</strong>.
                  </p>
                  {resultado.aguardandoTaxa && (
                    <p className="text-red-700 text-xs mt-2 font-bold">
                      Pague a taxa de reenvio abaixo para receber seu pedido em até 2 dias úteis.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Card de taxa de reenvio (aparece no dia 15) */}
            {resultado.aguardandoTaxa && !taxaPaga && (
              <div className="rounded-2xl overflow-hidden border border-orange-200 shadow-sm">
                <div className="bg-orange-500 px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">Taxa de Reenvio Necessária</p>
                    <p className="text-orange-100 text-xs">Pague R$ 9,00 e receba em até 2 dias úteis</p>
                  </div>
                </div>

                <div className="bg-white p-5 space-y-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Seu pedido chegou ao Centro de Distribuição em <strong>Guarulhos, SP</strong> e está
                    aguardando a taxa de reenvio para ser despachado novamente ao seu endereço.
                  </p>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">Taxa de reenvio — valor único</p>
                    <p className="text-3xl font-black text-green-700">R$ 9,00</p>
                    <p className="text-xs text-green-600 mt-1 font-semibold">
                      ✅ Após a confirmação, entrega em até <strong>2 dias úteis</strong>
                    </p>
                  </div>

                  {/* BOTÃO — abre o popup */}
                  <button
                    onClick={() => setShowPopup(true)}
                    className="flex items-center justify-center gap-2.5 w-full py-4 px-5 rounded-xl font-black text-base text-white transition-all hover:opacity-90 active:scale-95 shadow-md shadow-green-200"
                    style={{ background: "linear-gradient(135deg,#15803d,#22c55e)" }}
                  >
                    <PixIcon size={22} className="text-white" />
                    Pagar R$ 9,00 e receber meu pedido
                  </button>

                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-start gap-2.5">
                    <Truck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Após o comprovante recebido, seu pedido é despachado com prioridade e chega em{" "}
                      <strong>até 2 dias úteis</strong> no endereço cadastrado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Card de reenvio confirmado (após pagar) */}
            {taxaPaga && (
              <div className="bg-green-50 border border-green-500 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <CheckCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-green-800 text-sm">Reenvio aprovado!</p>
                  <p className="text-green-700 text-xs mt-0.5">Acompanhe o novo despacho na linha do tempo abaixo.</p>
                </div>
              </div>
            )}

            {/* Linha do tempo principal */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Pedido</p>
                  <p className="font-black text-lg text-gray-900">{codigoExibido}</p>
                  {nomeCliente && <p className="text-xs text-gray-400 mt-0.5">{nomeCliente}</p>}
                </div>
                <span className={`text-xs font-black px-3 py-1.5 rounded-full ${
                  resultado.aguardandoTaxa ? "bg-orange-100 text-orange-700" :
                  resultado.falhaEntrega   ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {resultado.status}
                </span>
              </div>

              <div>
                {resultado.etapas.map((etapa, i) => {
                  const Icon   = etapa.icone;
                  const isLast = i === resultado.etapas.length - 1;
                  const isTaxa = etapa.taxa === true;

                  const circleBg  = etapa.erro ? "bg-red-500" : isTaxa ? "bg-orange-400" : etapa.ok ? "bg-green-500" : "bg-gray-200";
                  const iconColor = (etapa.erro || etapa.ok || isTaxa) ? "text-white" : "text-gray-400";
                  const lineBg    = etapa.erro ? "bg-red-200" : etapa.ok ? "bg-green-300" : "bg-gray-200";
                  const lblColor  = etapa.erro ? "text-red-700" : isTaxa ? "text-orange-700" : etapa.ok ? "text-gray-900" : "text-gray-400";
                  const dtColor   = etapa.erro ? "text-red-500" : isTaxa ? "text-orange-500" : etapa.ok ? "text-green-600" : "text-gray-400";

                  return (
                    <div key={i} className="flex gap-4 relative">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 ${circleBg}`}>
                          <Icon className={`h-4 w-4 ${iconColor}`} />
                        </div>
                        {!isLast && <div className={`w-0.5 flex-1 my-1 ${lineBg}`} style={{ minHeight: 28 }} />}
                      </div>
                      <div className="pb-5">
                        <p className={`text-sm font-bold ${lblColor}`}>{etapa.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{etapa.descricao}</p>
                        <p className={`text-xs mt-0.5 font-semibold ${dtColor}`}>{etapa.data}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!resultado.falhaEntrega && !taxaPaga && (
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                  <strong>Previsão de entrega:</strong> até {resultado.previsao}. Prazos podem variar por região.
                </div>
              )}
            </div>

            {/* Timeline de reenvio (pós-pagamento) */}
            <EtapasReenvio />
          </>
        )}

        {/* Dicas */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-900 mb-4">Onde encontro meu código?</h2>
          <ul className="space-y-3 text-sm text-gray-600">
            {[
              "No e-mail ou WhatsApp — enviamos o código assim que o pedido for confirmado",
              "O código começa sempre com TM seguido de letras e números (ex: TM2A3B4C5D)",
              "Dúvidas? Fale conosco pelo WhatsApp (83) 99129-7085",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center text-sm text-gray-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          Não encontrou?{" "}
          <Link href="/fale-conosco" className="text-yellow-600 font-bold hover:underline ml-1">
            Entre em contato
          </Link>
        </div>
      </div>

      {/* ── POPUP ÚNICO DE TAXA ─────────────────────────────────────────────── */}
      {showPopup && (
        <TaxaPopup
          nomeCliente={nomeCliente}
          codigoRastreio={codigoExibido}
          onConfirmado={handleTaxaConfirmada}
          onFechar={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}
