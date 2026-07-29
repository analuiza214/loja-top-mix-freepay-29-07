import { Link } from "wouter";
import { ArrowLeft, RefreshCw, ShieldCheck, Clock, Package, AlertCircle, CheckCircle } from "lucide-react";

const topicos = [
  {
    icone: Clock,
    titulo: "Prazo para Solicitação",
    texto: "Você tem até 90 dias após a data de recebimento do produto para solicitar a troca ou devolução, conforme o Código de Defesa do Consumidor.",
  },
  {
    icone: Package,
    titulo: "Condições do Produto",
    texto: "O produto deve ser devolvido em sua embalagem original, sem sinais de uso, com todos os itens que acompanhavam o pedido (álbum, envelopes e brindes).",
  },
  {
    icone: RefreshCw,
    titulo: "Como Solicitar",
    texto: "Entre em contato pelo nosso WhatsApp ou e-mail com o número do pedido e o motivo da troca. Nossa equipe responderá em até 24 horas úteis.",
  },
  {
    icone: ShieldCheck,
    titulo: "Produto com Defeito",
    texto: "Se o produto chegou danificado ou em desacordo com o pedido, a troca é garantida sem nenhum custo para você, incluindo o frete de devolução.",
  },
  {
    icone: AlertCircle,
    titulo: "Produto sem Defeito",
    texto: "Para trocas por arrependimento, o frete de devolução é de responsabilidade do cliente. O reembolso é feito em até 10 dias úteis após o recebimento do produto.",
  },
];

export default function PoliticaDeTrocas() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar à Loja
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Política de Trocas e Devoluções</h1>
          <p className="text-sm text-gray-500 mt-1">Sua satisfação é nossa prioridade. Conheça seus direitos.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Banner garantia */}
        <div className="rounded-2xl p-6 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #166534 0%, #16a34a 100%)" }}>
          <ShieldCheck className="h-10 w-10 text-white mx-auto mb-2" />
          <h2 className="text-xl font-black text-white mb-1">Garantia de 90 Dias</h2>
          <p className="text-green-100 text-sm">Sem burocracia. Sem perguntas. 100% do seu dinheiro de volta.</p>
        </div>

        {/* Tópicos */}
        <div className="space-y-4">
          {topicos.map((t, i) => {
            const Icon = t.icone;
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #E09400, #f5b800)" }}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-sm mb-1">{t.titulo}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t.texto}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Passos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-900 mb-5">Passo a Passo para Solicitar</h2>
          <div className="space-y-4">
            {[
              "Entre em contato pelo WhatsApp ou e-mail informando seu número de pedido",
              "Nossa equipe avaliará seu caso em até 24h úteis",
              "Se aprovado, você receberá as instruções de devolução por e-mail",
              "Após recebermos o produto, o reembolso ou troca será processado em até 10 dias úteis",
            ].map((passo, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black text-white"
                  style={{ background: "linear-gradient(135deg, #E09400, #f5b800)" }}>
                  {i + 1}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed pt-0.5">{passo}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 rounded-2xl p-5 border border-green-200 flex gap-3 items-start">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">
            Dúvidas? <Link href="/fale-conosco" className="font-bold underline">Fale com nossa equipe</Link> — respondemos em até 2 horas no horário comercial.
          </p>
        </div>
      </div>
    </div>
  );
}
