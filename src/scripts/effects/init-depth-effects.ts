/* Entry point for the 3D depth effects, loaded from BaseLayout.
 * Respects reduced motion and only enables pointer-driven effects
 * on devices with a fine pointer (no tilt/parallax on touch). */

import { initTiltCards } from './tilt-cards';
import { initScrollDepthReveal } from './scroll-depth-reveal';
import { initPointerParallax } from './pointer-parallax';
import { initScrollVelocityTilt } from './scroll-velocity-tilt';

export function initDepthEffects(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.remove('fx3d');
    return;
  }

  initScrollDepthReveal();
  initScrollVelocityTilt();

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    initTiltCards();
    initPointerParallax();
  }
}
