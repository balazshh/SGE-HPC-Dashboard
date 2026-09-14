export function startRotatingFavicon() {
  const link = document.querySelector<HTMLLinkElement>("#app-favicon");
  const context = document.createElement("canvas").getContext("2d");
  if (!link || !context) return;

  const staticHref = link.href;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = context.canvas;
  canvas.width = canvas.height = 64;
  const image = new Image();
  let loaded = false;
  let animationFrame = 0;
  let lastFrame = 0;

  const render = (now: number) => {
    if (now - lastFrame >= 1000 / 12) {
      context.clearRect(0, 0, 64, 64);
      context.save();
      context.translate(32, 32);
      context.scale(Math.cos((now / 6000) * Math.PI * 2), 1);
      context.drawImage(image, -30, -30, 60, 60);
      context.restore();
      link.href = canvas.toDataURL("image/png");
      lastFrame = now;
    }
    animationFrame = requestAnimationFrame(render);
  };

  const update = () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (reducedMotion.matches) {
      link.href = staticHref;
      link.sizes.value = "512x512";
    } else if (loaded && !document.hidden) {
      link.sizes.value = "64x64";
      animationFrame = requestAnimationFrame(render);
    }
  };

  image.addEventListener("load", () => { loaded = true; update(); }, { once: true });
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", update);
  image.src = staticHref;
}
