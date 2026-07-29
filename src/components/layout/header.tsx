import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { getImagePath } from "@/lib/utils";

export function Header() {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src={getImagePath("/images/logo-topmix.webp")}
            alt="TopMix Brasil"
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="leading-none">
            <div className="font-black text-sm tracking-wide" style={{ color: "#E09400" }}>TOP MIX</div>
            <div className="text-[10px] font-bold tracking-widest" style={{ color: "#1a7a32" }}>BRASIL</div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">Loja</Link>
          <Link href="/produto/album-250-figurinhas" className="hover:text-gray-900 transition-colors">Mais Vendido</Link>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2 ml-auto">
          <Link href="/carrinho" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ShoppingCart className="h-5 w-5 text-gray-700" data-cart-icon />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: "#E09400" }}>
                {itemCount}
              </span>
            )}
          </Link>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5 text-gray-700" /> : <Menu className="h-5 w-5 text-gray-700" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col divide-y divide-gray-100">
            <Link href="/" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-gray-700">Loja</Link>
            <Link href="/produto/album-250-figurinhas" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-gray-700">Mais Vendido</Link>
            <button onClick={() => { setMenuOpen(false); setLocation("/carrinho"); }} className="py-3 text-sm font-medium text-gray-700 text-left flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Carrinho {itemCount > 0 && `(${itemCount} itens)`}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
