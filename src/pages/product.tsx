import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { products, reviews } from "@/lib/data";
import { getImagePath } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { flyToCart } from "@/lib/cart-fly";
import { pushEcommerceEvent } from "@/lib/tracking";
import { ShieldCheck, Truck, Star, ChevronLeft, Minus, Plus, ShoppingCart, CreditCard, BadgeCheck, Package, X, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function isWistia(item: string) { return item.startsWith("wistia:"); }
function wistiaId(item: string) { return item.replace("wistia:", ""); }

function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.82)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-sm w-full"
          onClick={e => e.stopPropagation()}
        >
          <img
            src={src}
            alt="Foto da avaliação"
            className="w-full rounded-2xl object-contain shadow-2xl"
            style={{ maxHeight: "75vh" }}
          />
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: "#fff" }}
          >
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Product() {
  const [, setLocation] = useLocation();
  const { slug } = useParams();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const product = products.find(p => p.slug === slug);
  const [activeImage, setActiveImage] = useState(product?.mainImage || "");

  useEffect(() => {
    if (product) setActiveImage(product.mainImage);
    window.scrollTo(0, 0);
  }, [product]);

  // view_item — dispara quando a página do produto é carregada
  useEffect(() => {
    if (!product) return;
    pushEcommerceEvent("view_item", {
      currency: "BRL",
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity: 1,
        },
      ],
    });
  }, [product?.id]);

  if (!product) {
    return (
      <div className="w-full px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
        <button onClick={() => setLocation("/")} className="px-6 py-2.5 rounded-xl font-semibold text-white" style={{ background: "#15803d" }}>
          Voltar para a loja
        </button>
      </div>
    );
  }

  const fireAddToCart = (qty: number) => {
    pushEcommerceEvent("add_to_cart", {
      currency: "BRL",
      value: product.price * qty,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity: qty,
        },
      ],
    });
  };

  const handleBuyNow = () => {
    fireAddToCart(quantity);
    addItem(product, quantity);
    setLocation("/carrinho");
  };

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    fireAddToCart(quantity);
    addItem(product, quantity);
    flyToCart(e.currentTarget);
  };

  const caixaProduct = products.find(p => p.id === "prod-6");
  const others = products.filter(p => p.id !== product.id && p.id !== "prod-6").slice(0, 2);
  const relatedProducts = product.id === "prod-6"
    ? products.filter(p => p.id !== "prod-6").slice(0, 3)
    : caixaProduct
      ? [caixaProduct, ...others]
      : others.slice(0, 3);

  return (
    <div className="w-full bg-white pb-16" style={{ overflowX: "hidden" }}>
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="w-full max-w-6xl mx-auto px-4 py-3 flex items-center text-xs text-gray-500 min-w-0">
          <button onClick={() => setLocation("/")} className="flex items-center shrink-0 hover:text-gray-900 transition-colors font-medium">
            <ChevronLeft className="h-4 w-4 mr-0.5" />Loja
          </button>
          <span className="mx-2 text-gray-300 shrink-0">/</span>
          <span className="text-gray-800 font-medium truncate min-w-0">{product.name}</span>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12">

        {/* Product top section: image + info */}
        <div className="flex flex-col md:grid md:grid-cols-2 md:gap-12 gap-6 mb-14 min-w-0">

          {/* Image Gallery */}
          <div className="min-w-0 w-full space-y-3">
            <div className="w-full rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden" style={{ minHeight: "220px" }}>
              <AnimatePresence mode="wait">
                {isWistia(activeImage) ? (
                  <motion.div
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full flex items-center justify-center bg-black"
                    style={{ height: "320px" }}
                  >
                    <iframe
                      src={`https://fast.wistia.net/embed/iframe/${wistiaId(activeImage)}?autoPlay=true`}
                      title="Vídeo do produto"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      frameBorder={0}
                      style={{ width: "180px", height: "320px", flexShrink: 0, border: "none" }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeImage}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full p-4 flex items-center justify-center"
                    style={{ minHeight: "220px", maxHeight: "320px" }}
                  >
                    <img
                      src={getImagePath(activeImage)}
                      alt={product.name}
                      style={{ maxWidth: "100%", maxHeight: "280px", objectFit: "contain", display: "block", margin: "0 auto" }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {product.gallery.length > 1 && (
              <div className="flex gap-2 pb-1 hide-scrollbar" style={{ overflowX: "auto" }}>
                {product.gallery.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(item)}
                    className={`shrink-0 rounded-xl border-2 p-1.5 transition-all bg-gray-50 flex items-center justify-center ${
                      activeImage === item ? "border-yellow-400" : "border-gray-200 hover:border-yellow-300"
                    }`}
                    style={{ width: 64, height: 64 }}
                  >
                    {isWistia(item) ? (
                      <div className="w-full h-full rounded-lg flex items-center justify-center" style={{ background: "#111" }}>
                        <PlayCircle className="h-7 w-7 text-white opacity-90" />
                      </div>
                    ) : (
                      <img src={getImagePath(item)} alt="" className="w-full h-full object-contain" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="min-w-0 w-full flex flex-col">
            {product.badge && (
              <span className="self-start px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase text-white mb-3" style={{ background: "#E09400" }}>
                {product.badge}
              </span>
            )}

            <h1 className="text-xl font-bold text-gray-900 mb-4 leading-snug" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mb-5">
              <div className="flex items-center gap-1.5">
                <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
                <span className="text-gray-900 font-semibold text-sm">{product.rating}</span>
                <span className="text-gray-500 text-sm">({product.reviewCount})</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">{product.soldCount}</span>
            </div>

            {/* Price Box */}
            <div className="w-full rounded-2xl p-4 mb-5 border min-w-0" style={{ background: "#fffbf0", borderColor: "#f5d87a" }}>
              {product.originalPrice && (
                <div className="text-sm text-gray-400 line-through mb-0.5">
                  R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                </div>
              )}
              <div className="font-black mb-1.5" style={{ color: "#E09400", fontSize: "clamp(2rem, 10vw, 3rem)" }}>
                R$ {product.price.toFixed(2).replace('.', ',')}
              </div>
              <div className="text-sm text-gray-600 mb-4" style={{ overflowWrap: "break-word" }}>
                ou <strong className="text-gray-800">{product.installment}</strong> no cartão sem juros
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200 min-w-0 gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <CreditCard className="h-4 w-4 text-green-700 shrink-0" />
                  <span className="text-sm font-semibold text-green-700 whitespace-nowrap">Preço no Pix:</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-green-700">R$ {product.pixPrice.toFixed(2).replace('.', ',')}</div>
                  <div className="text-xs text-green-600">10% de desconto</div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-5">
              {product.features.map((feat, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#E09400" }} />
                  <span style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>{feat}</span>
                </div>
              ))}
            </div>

            {/* Buy controls */}
            <div className="w-full space-y-3 mt-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium shrink-0">Quantidade:</span>
                <div className="flex items-center rounded-xl border border-gray-300 overflow-hidden shrink-0" style={{ height: 40 }}>
                  <button
                    className="flex items-center justify-center hover:bg-gray-100 transition-colors"
                    style={{ width: 40, height: 40 }}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4 text-gray-600" />
                  </button>
                  <div className="text-center font-bold text-gray-900" style={{ width: 36 }}>{quantity}</div>
                  <button
                    className="flex items-center justify-center hover:bg-gray-100 transition-colors"
                    style={{ width: 40, height: 40 }}
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
              <button
                className="w-full rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                style={{ background: "linear-gradient(135deg, #15803d, #22c55e)", height: 48, display: "block" }}
                onClick={handleBuyNow}
              >
                Comprar Agora
              </button>
              <button
                className="w-full rounded-xl font-semibold text-sm border-2 transition-all hover:bg-green-50 flex items-center justify-center gap-2"
                style={{ borderColor: "#15803d", color: "#15803d", height: 44 }}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                Adicionar ao Carrinho
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5 shrink-0"><Truck className="h-4 w-4 text-green-600 shrink-0" />Frete Grátis</span>
                <span className="flex items-center gap-1.5 shrink-0"><ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />Compra Segura</span>
                <span className="flex items-center gap-1.5 shrink-0"><Package className="h-4 w-4 text-green-600 shrink-0" />Entrega Rápida</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-12 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="font-bold text-lg text-gray-900 mb-3">Descrição do Produto</h2>
            <p className="text-gray-600 leading-relaxed text-sm" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>{product.description}</p>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Avaliações de Clientes</h2>
            <div className="flex items-center gap-2">
              <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
              <span className="font-bold text-yellow-600">4.9</span>
              <span className="text-gray-500 text-sm">({product.reviewCount} avaliações)</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(product.productReviews ?? reviews).map((review) => (
              <div key={review.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3 shadow-sm min-w-0">
                <div className="flex items-center justify-between min-w-0 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: `hsl(${(review.id * 53) % 360}, 55%, 45%)` }}>
                      {review.author.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-gray-900 truncate">{review.author}</div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <BadgeCheck className="h-3 w-3 shrink-0" />Verificado
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0">{[...Array(review.rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}</div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed flex-1" style={{ overflowWrap: "break-word" }}>"{review.text}"</p>
                {(review.photo || review.photos) && (
                  <div className="flex gap-2 pb-1 hide-scrollbar" style={{ overflowX: "auto" }}>
                    {review.photo && (
                      <button
                        onClick={() => setLightboxSrc(getImagePath(review.photo!))}
                        className="shrink-0 rounded-lg overflow-hidden border border-gray-200 hover:border-yellow-400 hover:scale-105 transition-all focus:outline-none"
                        style={{ width: 56, height: 56 }}
                      >
                        <img src={getImagePath(review.photo)} alt="" className="w-full h-full object-cover" />
                      </button>
                    )}
                    {review.photos?.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxSrc(getImagePath(p))}
                        className="shrink-0 rounded-lg overflow-hidden border border-gray-200 hover:border-yellow-400 hover:scale-105 transition-all focus:outline-none"
                        style={{ width: 56, height: 56 }}
                      >
                        <img src={getImagePath(p)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Related */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-5">Você também pode gostar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {relatedProducts.map(rp => (
              <Link key={rp.id} href={`/produto/${rp.slug}`}>
                <div className="rounded-xl border border-gray-200 p-3 cursor-pointer hover:border-yellow-400 hover:shadow-sm transition-all bg-white min-w-0 overflow-hidden">
                  <img src={getImagePath(rp.mainImage)} alt={rp.name} className="w-full object-contain mb-2" style={{ aspectRatio: "1/1" }} />
                  <p className="text-xs font-medium text-gray-800 line-clamp-2 mb-1" style={{ overflowWrap: "break-word" }}>{rp.name}</p>
                  <div className="font-black text-sm" style={{ color: "#E09400" }}>R$ {rp.price.toFixed(2).replace('.', ',')}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {lightboxSrc && (
        <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
