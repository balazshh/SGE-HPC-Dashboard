const size = 128;
const center = size / 2;
const faceSize = 116;
const faceInset = (size - faceSize) / 2;
const depth = 8;

export function startRotatingFavicon() {
  const link = document.querySelector<HTMLLinkElement>("#app-favicon");
  const context = document.createElement("canvas").getContext("2d");
  const faceContext = document.createElement("canvas").getContext("2d");
  const edgeContext = document.createElement("canvas").getContext("2d");
  const backContext = document.createElement("canvas").getContext("2d");
  if (!link || !context || !faceContext || !edgeContext || !backContext) return;

  const staticHref = link.href;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = context.canvas;
  const faceCanvas = faceContext.canvas;
  const edgeCanvas = edgeContext.canvas;
  const backCanvas = backContext.canvas;
  for (const surface of [canvas, faceCanvas, edgeCanvas, backCanvas]) surface.width = surface.height = size;

  const image = new Image();
  let loaded = false;
  let animationFrame = 0;

  const draw = (now: number) => {
      const angle = (now / 6000) * Math.PI * 2;
      const faceScale = Math.cos(angle);
      const depthProjection = Math.sin(angle);
      const edgeScale = Math.sign(faceScale || 1) * Math.max(Math.abs(faceScale), 0.03);
      const frontDepth = faceScale >= 0 ? depth : -depth;

      faceContext.clearRect(0, 0, size, size);
      faceContext.globalCompositeOperation = "source-over";
      faceContext.drawImage(image, faceInset, faceInset, faceSize, faceSize);
      faceContext.globalCompositeOperation = "source-atop";
      const glintX = center + Math.sin(angle) * 38;
      const glint = faceContext.createLinearGradient(glintX - 22, 0, glintX + 22, size);
      glint.addColorStop(0, "rgba(255, 255, 255, 0)");
      glint.addColorStop(0.42, "rgba(220, 238, 255, 0.12)");
      glint.addColorStop(0.5, "rgba(255, 255, 255, 0.92)");
      glint.addColorStop(0.58, "rgba(190, 220, 245, 0.18)");
      glint.addColorStop(1, "rgba(255, 255, 255, 0)");
      faceContext.fillStyle = glint;
      faceContext.fillRect(0, 0, size, size);

      context.clearRect(0, 0, size, size);
      context.save();
      context.translate(center, center);

      for (let layer = -depth; layer <= depth; layer += 1) {
        const layerDepth = faceScale >= 0 ? layer : -layer;
        context.save();
        context.translate(layerDepth * depthProjection, 0);
        context.scale(edgeScale, 1);
        context.drawImage(edgeCanvas, -center, -center);
        context.restore();
      }

      context.translate(frontDepth * depthProjection, 0);
      context.scale(faceScale, 1);
      context.drawImage(faceScale >= 0 ? faceCanvas : backCanvas, -center, -center);
      context.restore();

      link.href = canvas.toDataURL("image/png");
  };

  const render = (now: number) => {
    draw(now);
    animationFrame = requestAnimationFrame(render);
  };

  const update = () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (reducedMotion.matches) {
      link.href = staticHref;
      link.sizes.value = "512x512";
    } else if (loaded) {
      link.sizes.value = `${size}x${size}`;
      if (document.hidden) draw(0);
      else animationFrame = requestAnimationFrame(render);
    }
  };

  image.addEventListener("load", () => {
    edgeContext.drawImage(image, faceInset, faceInset, faceSize, faceSize);
    edgeContext.globalCompositeOperation = "source-in";
    const edgeMetal = edgeContext.createLinearGradient(0, 0, 0, size);
    edgeMetal.addColorStop(0, "#ffffff");
    edgeMetal.addColorStop(0.28, "#8fa5b8");
    edgeMetal.addColorStop(0.44, "#f7fbff");
    edgeMetal.addColorStop(0.52, "#1b2a38");
    edgeMetal.addColorStop(0.78, "#b8ccdc");
    edgeMetal.addColorStop(1, "#14202b");
    edgeContext.fillStyle = edgeMetal;
    edgeContext.fillRect(0, 0, size, size);

    backContext.drawImage(image, faceInset, faceInset, faceSize, faceSize);
    backContext.globalCompositeOperation = "source-atop";
    backContext.fillStyle = "rgba(12, 22, 32, 0.42)";
    backContext.fillRect(0, 0, size, size);

    loaded = true;
    update();
  }, { once: true });
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", update);
  image.src = staticHref;
}
