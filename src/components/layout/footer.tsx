import { Link } from "wouter";
import { getImagePath } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">

        {/* Brand */}
        <div className="text-center sm:text-left mb-8 pb-6 border-b border-gray-800">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <img src={getImagePath("/images/logo-topmix.webp")} alt="TopMix Brasil" className="h-10 w-10 rounded-full object-cover" />
            <div className="text-left">
              <div className="font-black text-sm tracking-wide" style={{ color: "#f5b800" }}>TOP MIX</div>
              <div className="text-[10px] font-bold tracking-widest text-green-400">BRASIL</div>
            </div>
          </Link>
          <p className="text-xs leading-relaxed text-gray-500 max-w-xs mx-auto sm:mx-0">
            Sua loja especializada em álbuns e figurinhas da Copa do Mundo 2026. Produtos 100% originais Panini.
          </p>
          <p className="text-[11px] text-gray-600 font-medium mt-2">CNPJ: 08.815.098/0001-47</p>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h4 className="font-bold text-sm mb-4 text-gray-200">Links Úteis</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-white transition-colors">Loja</Link></li>
              <li><Link href="/rastrear-pedido" className="hover:text-white transition-colors">Rastrear Pedido</Link></li>
              <li><Link href="/politica-de-trocas" className="hover:text-white transition-colors">Política de Trocas</Link></li>
              <li><Link href="/duvidas-frequentes" className="hover:text-white transition-colors">Dúvidas Frequentes</Link></li>
              <li><Link href="/fale-conosco" className="hover:text-white transition-colors">Fale Conosco</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-4 text-gray-200">Nossos Kits</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/produto/album-250-figurinhas" className="hover:text-white transition-colors">Kit 250 Figurinhas</Link></li>
              <li><Link href="/produto/album-180-figurinhas" className="hover:text-white transition-colors">Kit 180 Figurinhas</Link></li>
              <li><Link href="/produto/kit-140-figurinhas" className="hover:text-white transition-colors">Kit 140 Figurinhas</Link></li>
              <li><Link href="/produto/kit-252-figurinhas" className="hover:text-white transition-colors">Super Kit 252</Link></li>
            </ul>
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div className="mb-8">
          <h4 className="font-bold text-sm mb-3 text-gray-200 text-center sm:text-left">Formas de Pagamento</h4>
          <div className="flex justify-center sm:justify-start">
            <img
              src={getImagePath("/images/pagamentos.webp")}
              alt="Formas de pagamento: Amazon, Amex, Visa, Mastercard, PayPal, Pix"
              className="max-w-full rounded-xl"
              style={{ maxHeight: 60, objectFit: "contain" }}
            />
          </div>
          <p className="text-xs mt-1.5 font-bold text-center sm:text-left" style={{ color: "#f5b800" }}>
            10% de desconto no Pix!
          </p>
        </div>

        {/* Selos de Segurança */}
        <div className="mb-8">
          <h4 className="font-bold text-sm mb-4 text-gray-200 text-center sm:text-left">Site 100% Seguro</h4>
          <div className="flex flex-wrap gap-3 justify-center sm:justify-start items-center">
            {[
              { src: "/images/selo-compra-segura.webp",  alt: "Compra 100% Segura" },
              { src: "/images/selo-site-seguro.webp",    alt: "Site Seguro — SSL Certificado" },
              { src: "/images/selo-google-seguro.webp",  alt: "Google Site Seguro" },
              { src: "/images/selo-reclame-aqui.webp",   alt: "RA1000 — Reclame Aqui" },
            ].map(({ src, alt }) => (
              <div
                key={src}
                className="bg-white rounded-xl overflow-hidden flex items-center justify-center"
                style={{ height: 52, padding: "6px 10px" }}
              >
                <img
                  src={getImagePath(src)}
                  alt={alt}
                  style={{ maxHeight: 40, maxWidth: 120, objectFit: "contain" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600 text-center">
          <div className="space-y-0.5">
            <div>© 2026 TopMix Brasil. Todos os direitos reservados.</div>
            <div className="text-gray-700">CNPJ: 08.815.098/0001-47</div>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <span>Política de Privacidade</span>
            <span>•</span>
            <span>Termos de Uso</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
