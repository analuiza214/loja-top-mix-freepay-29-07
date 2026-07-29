import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, MessageCircle, Mail, Clock, Send, CheckCircle } from "lucide-react";

export default function FaleConosco() {
  const [form, setForm] = useState({ nome: "", email: "", assunto: "", mensagem: "" });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.mensagem) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setEnviado(true);
    }, 1400);
  }

  const canais = [
    {
      icone: MessageCircle,
      titulo: "WhatsApp",
      descricao: "Atendimento rápido de seg. a sáb.",
      detalhe: "(83) 99129-7085",
      cor: "#25D366",
      href: "https://wa.me/5583991297085",
    },
    {
      icone: Mail,
      titulo: "E-mail",
      descricao: "Respondemos em até 24h úteis",
      detalhe: "contato@topmixbrasil.com.br",
      cor: "#E09400",
      href: "mailto:contato@topmixbrasil.com.br",
    },
    {
      icone: Clock,
      titulo: "Horário",
      descricao: "Segunda a Sábado",
      detalhe: "08h às 20h",
      cor: "#16a34a",
      href: null,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar à Loja
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Fale Conosco</h1>
          <p className="text-sm text-gray-500 mt-1">Nossa equipe está pronta para ajudar você.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Canais de contato */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {canais.map((canal, i) => {
            const Icon = canal.icone;
            const inner = (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-2 h-full hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: canal.cor + "20" }}>
                  <Icon className="h-5 w-5" style={{ color: canal.cor }} />
                </div>
                <p className="font-black text-sm text-gray-900">{canal.titulo}</p>
                <p className="text-xs text-gray-400">{canal.descricao}</p>
                <p className="text-xs font-bold" style={{ color: canal.cor }}>{canal.detalhe}</p>
              </div>
            );
            return canal.href ? (
              <a key={i} href={canal.href} target="_blank" rel="noreferrer">{inner}</a>
            ) : (
              <div key={i}>{inner}</div>
            );
          })}
        </div>

        {/* Formulário */}
        {!enviado ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-black text-gray-900 mb-5">Envie sua mensagem</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">Nome *</label>
                  <input
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    required
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">E-mail *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">Assunto</label>
                <select
                  name="assunto"
                  value={form.assunto}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
                >
                  <option value="">Selecione um assunto</option>
                  <option value="rastreamento">Rastreamento de pedido</option>
                  <option value="troca">Troca ou devolução</option>
                  <option value="produto">Dúvida sobre produto</option>
                  <option value="pagamento">Pagamento</option>
                  <option value="outro">Outro assunto</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">Mensagem *</label>
                <textarea
                  name="mensagem"
                  value={form.mensagem}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Descreva sua dúvida ou problema com o máximo de detalhes possível..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-black text-sm text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}
              >
                <Send className="h-4 w-4" />
                {loading ? "Enviando..." : "ENVIAR MENSAGEM"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="font-black text-xl text-gray-900">Mensagem enviada!</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Recebemos sua mensagem, <strong>{form.nome}</strong>! Nossa equipe responderá em até 24 horas úteis no e-mail <strong>{form.email}</strong>.
            </p>
            <Link href="/">
              <button className="mt-2 px-6 py-2.5 rounded-xl font-black text-sm text-white hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}>
                VOLTAR À LOJA
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}