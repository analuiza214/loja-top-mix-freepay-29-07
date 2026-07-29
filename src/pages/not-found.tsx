import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Página não encontrada</h2>
        <p className="text-gray-500 mb-6 text-sm">A página que você está procurando não existe.</p>
        <button
          onClick={() => setLocation("/")}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(135deg, #E09400, #f5b800)" }}
        >
          Voltar à Loja
        </button>
      </div>
    </div>
  );
}
