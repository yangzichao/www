/* Tilts `[data-scroll-tilt]` surfaces away from the viewer while
 * scrolling, proportional to scroll velocity, then eases back flat —
 * the page feels like a plane you push through rather than a sheet
 * you slide. */

const MAX_TILT_DEGREES = 2.4;
const VELOCITY_TO_DEGREES = 0.035;
const TILT_DECAY = 0.86;
const SMOOTHING_FACTOR = 0.12;
const SETTLE_EPSILON = 0.003;

export function initScrollVelocityTilt(): void {
  const tiltSurfaces = document.querySelectorAll<HTMLElement>('[data-scroll-tilt]');
  if (!tiltSurfaces.length) return;

  let lastScrollY = window.scrollY;
  let targetTilt = 0;
  let currentTilt = 0;
  let pendingFrame = 0;

  const render = () => {
    targetTilt *= TILT_DECAY;
    currentTilt += (targetTilt - currentTilt) * SMOOTHING_FACTOR;

    const settled = Math.abs(currentTilt) < SETTLE_EPSILON && Math.abs(targetTilt) < SETTLE_EPSILON;
    tiltSurfaces.forEach((surface) => {
      surface.style.transform = settled
        ? ''
        : `perspective(1100px) rotateX(${currentTilt.toFixed(3)}deg)`;
    });

    pendingFrame = settled ? 0 : requestAnimationFrame(render);
  };

  window.addEventListener(
    'scroll',
    () => {
      const velocity = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      targetTilt = Math.max(
        -MAX_TILT_DEGREES,
        Math.min(MAX_TILT_DEGREES, velocity * VELOCITY_TO_DEGREES),
      );
      if (!pendingFrame) pendingFrame = requestAnimationFrame(render);
    },
    { passive: true },
  );
}
