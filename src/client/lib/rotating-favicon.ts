export function startRotatingFavicon() {
  const link = document.querySelector<HTMLLinkElement>("#app-favicon");
  const context = document.createElement("canvas").getContext("2d");
  const edgeContext = document.createElement("canvas").getContext("2d");
  const backContext = document.createElement("canvas").getContext("2d");
  if (!link || !context || !edgeContext || !backContext) return;

  const staticHref = link.href;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = context.canvas;
  const edgeCanvas = edgeContext.canvas;
  const backCanvas = backContext.canvas;
  canvas.width = canvas.height = edgeCanvas.width = edgeCanvas.height = backCanvas.width = backCanvas.height = 64;
  const image = new Image();
  let loaded = false;
  let animationFrame = 0;
  let lastFrame = 0;

  const render = (now: number) => {
    if (now - lastFrame >= 1000 / 30) {
      const angle = (now / 6000) * Math.PI * 2;
      const faceScale = Math.cos(angle);
      const depthProjection = Math.sin(angle);
      const edgeScale = Math.sign(faceScale || 1) * Math.max(Math.abs(faceScale), 0.06);
      const frontDepth = faceScale >= 0 ? 4 : -4;

      context.clearRect(0, 0, 64, 64);
      context.save();
      context.translate(32, 32);

      for (let layer = -4; layer <= 4; layer += 1) {
        const depth = faceScale >= 0 ? layer : -layer;
        context.save();
        context.translate(depth * depthProjection, 0);
        context.scale(edgeScale, 1);
        context.drawImage(edgeCanvas, -32, -32);
        context.restore();
      }

      context.translate(frontDepth * depthProjection, 0);
      context.scale(faceScale, 1);
      context.drawImage(faceScale >= 0 ? image : backCanvas, -30, -30, 60, 60);
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

  image.addEventListener("load", () => {
    edgeContext.drawImage(image, 2, 2, 60, 60);
    edgeContext.globalCompositeOperation = "source-in";
    const edgeMetal = edgeContext.createLinearGradient(0, 0, 64, 64);
    edgeMetal.addColorStop(0, "#f4f8fc");
    edgeMetal.addColorStop(0.45, "#647586");
    edgeMetal.addColorStop(1, "#17222d");
    edgeContext.fillStyle = edgeMetal;
    edgeContext.fillRect(0, 0, 64, 64);

    backContext.drawImage(image, 2, 2, 60, 60);
    backContext.globalCompositeOperation = "source-atop";
    backContext.fillStyle = "rgba(15, 25, 35, 0.48)";
    backContext.fillRect(0, 0, 64, 64);

    loaded = true;
    update();
  }, { once: true });
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", update);
  image.src = staticHref;
}
