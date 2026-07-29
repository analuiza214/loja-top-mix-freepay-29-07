/**
 * WistiaPlayerLazy — embed padrão Wistia com injeção de scripts sob demanda.
 * Injeta os scripts apenas uma vez por página (singleton) e renderiza
 * o player oficial do Wistia sem facade customizada.
 */

import { useEffect, useRef } from "react";

// Singleton: injeta E-v1.js apenas uma vez
let _wistiaScriptInjected = false;
function injectWistiaScript() {
  if (_wistiaScriptInjected) return;
  _wistiaScriptInjected = true;
  const s = document.createElement("script");
  s.src = "https://fast.wistia.com/assets/external/E-v1.js";
  s.async = true;
  document.head.appendChild(s);
}

interface WistiaPlayerLazyProps {
  mediaId: string;
  aspect?: number;
  autoLoad?: boolean; // mantido por compatibilidade com home.tsx
}

export function WistiaPlayerLazy({
  mediaId,
  aspect = 0.5625,
}: WistiaPlayerLazyProps) {
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current) return;
    injectedRef.current = true;

    // Script específico do vídeo (jsonp)
    const jsonp = document.createElement("script");
    jsonp.src = `https://fast.wistia.com/embed/medias/${mediaId}.jsonp`;
    jsonp.async = true;
    document.head.appendChild(jsonp);

    // Script global do player (singleton)
    injectWistiaScript();
  }, [mediaId]);

  return (
    <div style={{ position: "relative", paddingBottom: `${aspect * 100}%` }}>
      <div
        className={`wistia_embed wistia_async_${mediaId} videoFoam=true`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        &nbsp;
      </div>
    </div>
  );
}
