/* Pointer-tracked 3D tilt + glare for `[data-tilt]` elements.
 * Writes CSS custom properties consumed by styles/effects/depth-3d.css. */

const MAX_TILT_DEGREES = 7;
const HOVER_LIFT_PX = 14;

export function initTiltCards(): void {
  const tiltElements = document.querySelectorAll<HTMLElement>('[data-tilt]');

  tiltElements.forEach((element) => {
    const glare = document.createElement('span');
    glare.className = 'tilt-glare';
    glare.setAttribute('aria-hidden', 'true');
    element.appendChild(glare);

    let pendingFrame = 0;
    let lastPointerEvent: PointerEvent | null = null;

    const applyTilt = () => {
      pendingFrame = 0;
      if (!lastPointerEvent) return;

      const rect = element.getBoundingClientRect();
      const relativeX = (lastPointerEvent.clientX - rect.left) / rect.width;
      const relativeY = (lastPointerEvent.clientY - rect.top) / rect.height;

      element.style.setProperty('--tilt-rx', `${((0.5 - relativeY) * MAX_TILT_DEGREES).toFixed(2)}deg`);
      element.style.setProperty('--tilt-ry', `${((relativeX - 0.5) * MAX_TILT_DEGREES).toFixed(2)}deg`);
      element.style.setProperty('--tilt-z', `${HOVER_LIFT_PX}px`);
      element.style.setProperty('--glare-x', `${(relativeX * 100).toFixed(1)}%`);
      element.style.setProperty('--glare-y', `${(relativeY * 100).toFixed(1)}%`);
      element.style.setProperty('--glare-opacity', '1');
    };

    element.addEventListener('pointermove', (event) => {
      lastPointerEvent = event;
      if (!pendingFrame) pendingFrame = requestAnimationFrame(applyTilt);
    });

    element.addEventListener('pointerleave', () => {
      lastPointerEvent = null;
      element.style.setProperty('--tilt-rx', '0deg');
      element.style.setProperty('--tilt-ry', '0deg');
      element.style.setProperty('--tilt-z', '0px');
      element.style.setProperty('--glare-opacity', '0');
    });
  });
}
