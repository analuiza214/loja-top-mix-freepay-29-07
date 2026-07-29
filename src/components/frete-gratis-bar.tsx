import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function FreteGratisBar() {
  const [location] = useLocation();
  const [cidade, setCidade] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setDeadline(`${hh}:${mm}`);

    // Mostra pelo IP imediatamente (enquanto GPS não resolve)
    function fetchByIp() {
      fetch("https://ipapi.co/json/")
        .then(r => r.json())
        .then(d => { if (d.city) setCidade(prev => prev ?? d.city); })
        .catch(() => {});
    }

    // Busca GPS e atualiza para a cidade real após permissão
    function fetchByGps() {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          // zoom=10 = nível de município; municipality é o campo correto para cidades pequenas do BR
          fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt&zoom=10`
          )
            .then(r => r.json())
            .then(d => {
              const city =
                d.address?.municipality || // Nome do município (correto para cidades pequenas BR)
                d.address?.city ||
                d.address?.town ||
                d.address?.village ||
                d.address?.county;
              if (city) setCidade(city); // Substitui o resultado do IP pelo GPS real
            })
            .catch(() => {}); // Se falhar, mantém a cidade do IP
        },
        () => {}, // Negou permissão: mantém cidade do IP já exibida
        { timeout: 30000, maximumAge: 600000 } // 30s para o usuário aceitar
      );
    }

    if ("geolocation" in navigator) {
      fetchByIp();  // Mostra pelo IP imediatamente
      fetchByGps(); // Quando GPS resolver, atualiza para a cidade real
    } else {
      fetchByIp();
    }
  }, []);

  if (!cidade) return null;
  if (location === "/sucesso" || location === "/rastrear-pedido") return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] w-full flex items-center justify-center gap-2 py-2.5 px-4 text-white text-xs font-black text-center"
      style={{ background: "linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #b91c1c 100%)" }}
    >
      <span>🚚</span>
      <span>
        FRETE GRÁTIS até <strong>{deadline}</strong> para <strong>{cidade}</strong>
      </span>
      <span className="ml-1 text-red-200 text-[10px] font-semibold hidden sm:inline">— Garanta o seu agora!</span>
    </div>
  );
}
