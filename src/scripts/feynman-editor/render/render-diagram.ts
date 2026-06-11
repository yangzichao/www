import type {
  DiagramElement,
  LabelElement,
  LoopElement,
  PropagatorElement,
  VertexElement,
} from '../diagram-types';
import { basePathPointAt, sampleLoop } from '../geometry';
import { labelHtml } from './label-katex';
import {
  basePathData,
  gluonPathData,
  loopBasePathData,
  loopGluonPathData,
  loopPhotonPathData,
  photonPathData,
} from './line-paths';

const SVG_NS = 'http://www.w3.org/2000/svg';
const STROKE = '#111111';
const SELECTION_COLOR = '#3b82f6';

export interface RenderOptions {
  selectedId: string | null;
  /** When true, skip grid/selection chrome and render labels as plain
   * <text> (KaTeX foreignObject markup doesn't survive SVG/PNG export). */
  presentation?: boolean;
}

export function renderDiagram(
  svg: SVGSVGElement,
  elements: DiagramElement[],
  options: RenderOptions
): void {
  // Clear everything except <defs> (grid pattern lives there).
  for (const child of Array.from(svg.children)) {
    if (child.tagName !== 'defs') child.remove();
  }

  if (!options.presentation) {
    svg.appendChild(
      createSvgElement('rect', {
        x: '0',
        y: '0',
        width: '100%',
        height: '100%',
        fill: 'url(#feynman-grid)',
      })
    );
  }

  for (const element of elements) {
    const group = createSvgElement('g', { 'data-element-id': element.id }) as SVGGElement;

    if (element.type === 'propagator') renderPropagator(group, element);
    else if (element.type === 'loop') renderLoop(group, element);
    else if (element.type === 'vertex') renderVertex(group, element);
    else renderLabel(group, element, options.presentation === true);

    if (element.id === options.selectedId && !options.presentation) {
      appendSelectionHandles(group, element);
    }
    svg.appendChild(group);
  }
}

function renderPropagator(group: SVGGElement, line: PropagatorElement): void {
  // Invisible fat stroke so thin/wavy lines are easy to click.
  group.appendChild(
    createSvgElement('path', {
      d: basePathData(line),
      fill: 'none',
      stroke: 'transparent',
      'stroke-width': '14',
    })
  );
  group.appendChild(styledKindPath(line.kind, kindPathData(line)));
  if (line.arrow) {
    const mid = basePathPointAt(line, 0.5);
    group.appendChild(buildArrowHead(mid.x, mid.y, mid.tx, mid.ty));
  }
}

function kindPathData(line: PropagatorElement): string {
  switch (line.kind) {
    case 'photon':
      return photonPathData(line);
    case 'gluon':
      return gluonPathData(line);
    default:
      return basePathData(line);
  }
}

function renderLoop(group: SVGGElement, loop: LoopElement): void {
  group.appendChild(
    createSvgElement('path', {
      d: loopBasePathData(loop),
      fill: 'none',
      stroke: 'transparent',
      'stroke-width': '14',
    })
  );

  const pathData =
    loop.kind === 'photon'
      ? loopPhotonPathData(loop)
      : loop.kind === 'gluon'
        ? loopGluonPathData(loop)
        : loopBasePathData(loop);
  group.appendChild(styledKindPath(loop.kind, pathData));

  if (loop.arrow) {
    // Arrow at the far side of the loop (t = 0.5, the left-hand point).
    const samples = sampleLoop(loop, 65);
    const mid = samples[32];
    group.appendChild(buildArrowHead(mid.x, mid.y, mid.tx, mid.ty));
  }
}

/** Stroke styling shared by propagators and loops for a given kind. */
function styledKindPath(kind: PropagatorElement['kind'], pathData: string): SVGElement {
  const attributes: Record<string, string> = {
    d: pathData,
    fill: 'none',
    stroke: STROKE,
    'stroke-width': '1.6',
  };
  if (kind === 'scalar') attributes['stroke-dasharray'] = '7 5';
  if (kind === 'ghost') {
    attributes['stroke-dasharray'] = '1.5 4.5';
    attributes['stroke-linecap'] = 'round';
  }
  return createSvgElement('path', attributes);
}

function buildArrowHead(x: number, y: number, tx: number, ty: number): SVGElement {
  const angleDegrees = (Math.atan2(ty, tx) * 180) / Math.PI;
  return createSvgElement('path', {
    d: 'M 5 0 L -4 4 L -2 0 L -4 -4 Z',
    fill: STROKE,
    transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angleDegrees.toFixed(1)})`,
  });
}

function renderVertex(group: SVGGElement, vertex: VertexElement): void {
  group.appendChild(
    createSvgElement('circle', {
      cx: String(vertex.x),
      cy: String(vertex.y),
      r: String(vertex.radius),
      fill: STROKE,
    })
  );
}

function renderLabel(group: SVGGElement, label: LabelElement, presentation: boolean): void {
  if (!presentation) {
    // KaTeX-rendered HTML inside a foreignObject, centered on the anchor.
    const foreign = createSvgElement('foreignObject', {
      x: String(label.x - 150),
      y: String(label.y - 30),
      width: '300',
      height: '60',
      'pointer-events': 'none',
    });
    const container = document.createElement('div');
    container.className = 'feynman-label-content';
    container.innerHTML = labelHtml(label.text);
    foreign.appendChild(container);
    group.appendChild(foreign);
    return;
  }

  const text = createSvgElement('text', {
    x: String(label.x),
    y: String(label.y),
    'font-size': '15',
    'font-style': 'italic',
    'font-family': 'Georgia, "Times New Roman", serif',
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    fill: STROKE,
  });
  text.textContent = label.text;
  group.appendChild(text);
}

function appendSelectionHandles(group: SVGGElement, element: DiagramElement): void {
  if (element.type === 'propagator') {
    group.appendChild(selectionHalo(basePathData(element)));
    appendHandle(group, element.x1, element.y1, 'endpoint-1');
    appendHandle(group, element.x2, element.y2, 'endpoint-2');
    const mid = basePathPointAt(element, 0.5);
    appendHandle(group, mid.x, mid.y, 'bend', true);
  } else if (element.type === 'loop') {
    group.appendChild(selectionHalo(loopBasePathData(element)));
    group.appendChild(dashedOutlineCircle(element.cx, element.cy, element.radius + 7));
    appendHandle(group, element.cx + element.radius, element.cy, 'radius', true);
  } else if (element.type === 'vertex') {
    group.appendChild(dashedOutlineCircle(element.x, element.y, element.radius + 5));
  } else {
    group.appendChild(
      createSvgElement('rect', {
        x: String(element.x - 30),
        y: String(element.y - 14),
        width: '60',
        height: '28',
        fill: 'none',
        stroke: SELECTION_COLOR,
        'stroke-width': '1.5',
        'stroke-dasharray': '3 3',
        rx: '4',
      })
    );
  }
}

function selectionHalo(pathData: string): SVGElement {
  return createSvgElement('path', {
    d: pathData,
    fill: 'none',
    stroke: SELECTION_COLOR,
    'stroke-width': '6',
    'stroke-opacity': '0.18',
  });
}

function dashedOutlineCircle(cx: number, cy: number, radius: number): SVGElement {
  return createSvgElement('circle', {
    cx: String(cx),
    cy: String(cy),
    r: String(radius),
    fill: 'none',
    stroke: SELECTION_COLOR,
    'stroke-width': '1.5',
    'stroke-dasharray': '3 3',
  });
}

function appendHandle(
  group: SVGGElement,
  x: number,
  y: number,
  handleName: string,
  isHollow = false
): void {
  group.appendChild(
    createSvgElement('circle', {
      cx: String(x),
      cy: String(y),
      r: '5',
      fill: isHollow ? '#ffffff' : SELECTION_COLOR,
      stroke: SELECTION_COLOR,
      'stroke-width': '1.5',
      'data-handle': handleName,
      cursor: 'grab',
    })
  );
}

function createSvgElement(tag: string, attributes: Record<string, string>): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  return el;
}
