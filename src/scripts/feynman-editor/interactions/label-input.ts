import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../diagram-types';
import type { Point } from '../geometry';

/**
 * Floating <input> overlay for creating/editing text labels in place.
 * Commits on Enter or blur; Escape cancels.
 */
export function openLabelInput(
  canvasWrapper: HTMLElement,
  svg: SVGSVGElement,
  canvasPoint: Point,
  initialText: string,
  onCommit: (text: string) => void
): void {
  // Avoid stacking two editors if the user clicks again quickly.
  canvasWrapper.querySelector('.feynman-label-input')?.remove();

  const svgRect = svg.getBoundingClientRect();
  const wrapperRect = canvasWrapper.getBoundingClientRect();
  const pixelX = svgRect.left - wrapperRect.left + (canvasPoint.x / CANVAS_WIDTH) * svgRect.width;
  const pixelY = svgRect.top - wrapperRect.top + (canvasPoint.y / CANVAS_HEIGHT) * svgRect.height;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = initialText;
  input.placeholder = 'e.g. $e^-$ or \\mu';
  input.className = 'feynman-label-input';
  input.style.left = `${pixelX}px`;
  input.style.top = `${pixelY}px`;

  let finished = false;
  const finish = (commit: boolean) => {
    if (finished) return;
    finished = true;
    const text = input.value;
    input.remove();
    if (commit) onCommit(text);
  };

  input.addEventListener('keydown', (event) => {
    event.stopPropagation(); // keep Delete/Backspace from deleting elements
    if (event.key === 'Enter') finish(true);
    if (event.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));

  canvasWrapper.appendChild(input);
  input.focus();
  input.select();
}
