import type { DiagramElement } from '../diagram-types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../diagram-types';
import { renderDiagram } from '../render/render-diagram';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Serialize a clean copy (no grid, no selection chrome, plain-text labels). */
export function buildPresentationSvgMarkup(elements: DiagramElement[]): string {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`);
  svg.setAttribute('width', String(CANVAS_WIDTH));
  svg.setAttribute('height', String(CANVAS_HEIGHT));

  renderDiagram(svg, elements, { selectedId: null, presentation: true });

  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', '#ffffff');
  svg.insertBefore(background, svg.firstChild);

  return new XMLSerializer().serializeToString(svg);
}

export function downloadDiagramAsSvg(elements: DiagramElement[]): void {
  const markup = buildPresentationSvgMarkup(elements);
  const blob = new Blob([markup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'feynman-diagram.svg';
  anchor.click();
  URL.revokeObjectURL(url);
}
