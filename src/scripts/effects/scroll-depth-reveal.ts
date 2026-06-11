/* Reveals `[data-depth-reveal]` elements as they enter the viewport:
 * they float forward from z-depth (see styles/effects/depth-3d.css).
 * Children of a `[data-depth-stagger]` container reveal in sequence. */

const STAGGER_STEP_MS = 70;
const STAGGER_MAX_MS = 420;

export function initScrollDepthReveal(): void {
  const revealElements = document.querySelectorAll<HTMLElement>('[data-depth-reveal]');
  if (!revealElements.length) return;

  document.querySelectorAll<HTMLElement>('[data-depth-stagger]').forEach((container) => {
    container.querySelectorAll<HTMLElement>('[data-depth-reveal]').forEach((child, index) => {
      child.style.setProperty('--reveal-delay', `${Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS)}ms`);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('depth-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );

  revealElements.forEach((element) => observer.observe(element));
}
