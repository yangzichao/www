/* Smoothed pointer parallax for `[data-parallax-depth="N"]` elements.
 * N is the maximum shift in px; elements also rotate slightly toward
 * the cursor so they read as floating in front of the page. */

const SMOOTHING_FACTOR = 0.08;
const ROTATION_RATIO = 0.5;
const SETTLE_EPSILON = 0.0005;

export function initPointerParallax(): void {
  const parallaxLayers = document.querySelectorAll<HTMLElement>('[data-parallax-depth]');
  if (!parallaxLayers.length) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let pendingFrame = 0;

  const render = () => {
    currentX += (targetX - currentX) * SMOOTHING_FACTOR;
    currentY += (targetY - currentY) * SMOOTHING_FACTOR;

    parallaxLayers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.parallaxDepth ?? '0');
      const shiftX = (currentX * depth).toFixed(2);
      const shiftY = (currentY * depth).toFixed(2);
      const rotateY = (currentX * depth * ROTATION_RATIO).toFixed(2);
      const rotateX = (-currentY * depth * ROTATION_RATIO).toFixed(2);
      layer.style.transform =
        `perspective(800px) translate3d(${shiftX}px, ${shiftY}px, 0) ` +
        `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    });

    const settled =
      Math.abs(targetX - currentX) < SETTLE_EPSILON && Math.abs(targetY - currentY) < SETTLE_EPSILON;
    pendingFrame = settled ? 0 : requestAnimationFrame(render);
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      targetX = event.clientX / window.innerWidth - 0.5;
      targetY = event.clientY / window.innerHeight - 0.5;
      if (!pendingFrame) pendingFrame = requestAnimationFrame(render);
    },
    { passive: true },
  );
}
