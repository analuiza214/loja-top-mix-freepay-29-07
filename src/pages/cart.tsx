import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { getImagePath } from "@/lib/utils";
import { pushEcommerceEvent } from "@/lib/tracking";
import { Minus, Plus, Trash2, ArrowRight, ShoppingCart, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { items, removeItem, updateQuantity, total, pixTotal, itemCount } = useCart();

  // view_cart — dispara quando o carrinho é aberto com itens
  useEffect(() => {
    if (items.length === 0) return;
    pushEcommerceEvent("view_cart", {
      currency: "BRL",
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }, []);

  const handleFinalizarCompra = () => {
    // begin_checkout — dispara quando clica em Finalizar Compra
    pushEcommerceEvent("begin_checkout", {
      currency: "BRL",
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    }, {
      event_id: "checkout_" + Date.now(),
    });
    setLocation("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center bg-white min-h-[60vh]">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
          <ShoppingCart className="h-9 w-9 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold mb-3 text-gray-900">Seu carrinho está vazio</h1>
        <p className="text-gray-500 mb-7 max-w-sm text-sm leading-relaxed">
          Adicione produtos fantásticos da Copa do Mundo 2026 ao seu carrinho!
        </p>
        <button onClick={() => setLocation("/")} className="px-8 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all shadow-sm" style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}>
          Continuar Comprando
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-6">
          Meu Carrinho <span className="text-gray-400 font-normal text-lg">({itemCount} {itemCount === 1 ? "item" : "itens"})</span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 items-start shadow-sm"
              >
                <Link href={`/produto/${item.slug}`} className="shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center p-1.5">
                    <img src={getImagePath(item.mainImage)} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/produto/${item.slug}`}>
                    <h3 className="font-semibold text-sm text-gray-900 hover:text-yellow-700 transition-colors line-clamp-2 mb-1">{item.name}</h3>
                  </Link>
                  <p className="text-xs text-gray-400 mb-3">Ref: {item.id}</p>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden h-9">
                      <button className="w-9 h-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>
                        <Minus className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                      <div className="w-9 text-center text-sm font-semibold text-gray-900">{item.quantity}</div>
                      <button className="w-9 h-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                      <div className="text-right">
                        <div className="font-black text-base" style={{ color: "#E09400" }}>
                          R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </div>
                        <div className="text-xs text-green-600">Pix: R$ {(item.pixPrice * item.quantity).toFixed(2).replace('.', ',')}</div>
                      </div>
                      <button
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <button onClick={() => setLocation("/")} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 mt-2">
              Continuar comprando
            </button>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-20 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Resumo do Pedido</h2>

              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({itemCount} itens)</span>
                  <span className="font-medium text-gray-900">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Frete</span>
                  <span className="font-semibold text-green-600">Grátis</span>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-gray-700">Total (Cartão)</span>
                    <span className="font-bold text-xl text-gray-900">R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    em até 5x de R$ {(total / 5).toFixed(2).replace('.', ',')} sem juros
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-green-50 border border-green-200">
                  <div>
                    <div className="font-semibold text-xs text-green-700">Total no Pix</div>
                    <div className="text-xs text-green-600">Economia de R$ {(total - pixTotal).toFixed(2).replace('.', ',')}</div>
                  </div>
                  <div className="font-black text-xl text-green-700">R$ {pixTotal.toFixed(2).replace('.', ',')}</div>
                </div>
              </div>

              <button
                className="w-full py-3.5 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-95 shadow-sm flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #15803d, #22c55e)" }}
                onClick={handleFinalizarCompra}
              >
                Finalizar Compra <ArrowRight className="h-5 w-5" />
              </button>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                Seus dados estão protegidos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
