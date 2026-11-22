import { initTiltCards } from './tilt-cards';
import { initScrollDepthReveal } from './scroll-depth-reveal';
import { initPointerParallax } from './pointer-parallax';
import { initScrollVelocityTilt } from './scroll-velocity-tilt';

export function initDepthEffects(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.remove('depth-effects-enabled');
    return;
  }

  initScrollDepthReveal();
  initScrollVelocityTilt();

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    initTiltCards();
    initPointerParallax();
  }
}
