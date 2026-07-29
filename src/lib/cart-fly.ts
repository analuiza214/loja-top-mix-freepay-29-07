export function flyToCart(buttonEl: HTMLElement) {
  const cartEl = document.querySelector<HTMLElement>("[data-cart-icon]");
  if (!cartEl) return;

  const src = buttonEl.getBoundingClientRect();
  const dst = cartEl.getBoundingClientRect();

  const el = document.createElement("div");
  el.textContent = "🛒";
  el.style.cssText = `
    position: fixed;
    z-index: 99999;
    font-size: 22px;
    left: ${src.left + src.width / 2 - 11}px;
    top: ${src.top + src.height / 2 - 11}px;
    pointer-events: none;
    line-height: 1;
    filter: drop-shadow(0 2px 6px rgba(21,128,61,0.5));
  `;
  document.body.appendChild(el);

  const dx = dst.left + dst.width / 2 - (src.left + src.width / 2);
  const dy = dst.top + dst.height / 2 - (src.top + src.height / 2);
  const arc = Math.min(-120, dy * -0.6);

  const anim = el.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 + arc}px) scale(0.9)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0 },
    ],
    { duration: 680, easing: "cubic-bezier(0.25,0.46,0.45,0.94)", fill: "forwards" }
  );

  anim.onfinish = () => {
    el.remove();
    cartEl.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.5)" },
        { transform: "scale(0.9)" },
        { transform: "scale(1)" },
      ],
      { duration: 320, easing: "ease-out" }
    );
  };
}
