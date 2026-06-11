import type { DiagramElement, LoopElement, PropagatorElement } from '../diagram-types';
import { CANVAS_HEIGHT } from '../diagram-types';
import { arcFromBend } from '../geometry';
import {
  GLUON_AMPLITUDE,
  PHOTON_AMPLITUDE,
  gluonWindingCount,
  gluonWindingCountForLength,
  loopPathLength,
  photonWiggleCount,
  photonWiggleCountForLength,
} from '../render/line-paths';

const MARGIN = 10;
const SCALAR_DASH_SIZE = 5;
const GHOST_DASH_SIZE = 1.5;

/**
 * Generate LaTeX for the axodraw2 package. The editor's SVG frame is
 * y-down with the origin top-left; axodraw is y-up with the origin
 * bottom-left, so every y is flipped and the whole diagram is translated
 * so its bounding box starts at (MARGIN, MARGIN).
 */
export function exportToAxodraw(elements: DiagramElement[]): string {
  if (elements.length === 0) return '% (empty diagram)';

  const bounds = diagramBounds(elements);
  const offsetX = MARGIN - bounds.minX;
  const offsetY = MARGIN - (CANVAS_HEIGHT - bounds.maxY);
  const width = Math.ceil(bounds.maxX - bounds.minX + 2 * MARGIN);
  const height = Math.ceil(bounds.maxY - bounds.minY + 2 * MARGIN);

  const toAxo = (x: number, y: number): [number, number] => [
    round1(x + offsetX),
    round1(CANVAS_HEIGHT - y + offsetY),
  ];

  const lines: string[] = [
    '% Generated with the Feynman diagram editor — zichaoyang.com/tools/feynman',
    '% Requires: \\usepackage{axodraw2}  (compile with latex+dvips or pdflatex)',
    '% Tip: wrap in \\SetScale{0.5} ... \\SetScale{1} if the diagram is too large.',
    `\\begin{axopicture}(${width},${height})`,
  ];

  for (const element of elements) {
    if (element.type === 'propagator') {
      lines.push(propagatorCommand(element, toAxo));
    } else if (element.type === 'loop') {
      lines.push(loopCommand(element, toAxo));
    } else if (element.type === 'vertex') {
      const [x, y] = toAxo(element.x, element.y);
      lines.push(`  \\Vertex(${x},${y}){${round1(element.radius)}}`);
    } else {
      const [x, y] = toAxo(element.x, element.y);
      lines.push(`  \\Text(${x},${y})[c]{${element.text}}`);
    }
  }

  lines.push('\\end{axopicture}');
  return lines.join('\n');
}

function propagatorCommand(
  line: PropagatorElement,
  toAxo: (x: number, y: number) => [number, number]
): string {
  const arc = arcFromBend(line);
  const [x1, y1] = toAxo(line.x1, line.y1);
  const [x2, y2] = toAxo(line.x2, line.y2);
  const from = `(${x1},${y1})`;
  const to = `(${x2},${y2})`;

  if (!arc) {
    switch (line.kind) {
      case 'photon':
        return `  \\Photon${from}${to}{${PHOTON_AMPLITUDE}}{${photonWiggleCount(line)}}`;
      case 'gluon':
        return `  \\Gluon${from}${to}{${GLUON_AMPLITUDE}}{${gluonWindingCount(line)}}`;
      case 'scalar':
        return line.arrow
          ? `  \\DashArrowLine${from}${to}{${SCALAR_DASH_SIZE}}`
          : `  \\DashLine${from}${to}{${SCALAR_DASH_SIZE}}`;
      case 'ghost':
        return line.arrow
          ? `  \\DashArrowLine${from}${to}{${GHOST_DASH_SIZE}}`
          : `  \\DashLine${from}${to}{${GHOST_DASH_SIZE}}`;
      case 'fermion':
        return line.arrow ? `  \\ArrowLine${from}${to}` : `  \\Line${from}${to}`;
    }
  }

  // Arc: flip the center into axodraw's frame; SVG angles map to -angle
  // because the y axis flips, which also reverses the sweep direction.
  const [cx, cy] = toAxo(arc.cx, arc.cy);
  const radius = round1(arc.radius);
  const startDegrees = -toDegrees(arc.startAngle);
  const endDegrees = -toDegrees(arc.startAngle + arc.sweep);
  const isCounterClockwise = -arc.sweep > 0;

  // axodraw arc commands draw counter-clockwise from the first angle to
  // the second, so order the angles accordingly (\ArrowArcn handles the
  // clockwise case while keeping the arrow pointing start → end).
  let [phi1, phi2] = isCounterClockwise ? [startDegrees, endDegrees] : [endDegrees, startDegrees];
  while (phi2 <= phi1) phi2 += 360;
  const center = `(${cx},${cy})(${radius},${round1(phi1)},${round1(phi2)})`;

  switch (line.kind) {
    case 'photon':
      return `  \\PhotonArc${center}{${PHOTON_AMPLITUDE}}{${photonWiggleCount(line)}}`;
    case 'gluon':
      return `  \\GluonArc${center}{${GLUON_AMPLITUDE}}{${gluonWindingCount(line)}}`;
    case 'scalar':
      return `  \\DashCArc${center}{${SCALAR_DASH_SIZE}}`;
    case 'ghost':
      return `  \\DashCArc${center}{${GHOST_DASH_SIZE}}`;
    case 'fermion':
      if (!line.arrow) return `  \\CArc${center}`;
      return isCounterClockwise
        ? `  \\ArrowArc(${cx},${cy})(${radius},${round1(phi1)},${round1(phi2)})`
        : `  \\ArrowArcn(${cx},${cy})(${radius},${round1(startDegrees)},${round1(endDegrees)})`;
  }
}

function loopCommand(
  loop: LoopElement,
  toAxo: (x: number, y: number) => [number, number]
): string {
  const [cx, cy] = toAxo(loop.cx, loop.cy);
  const circle = `(${cx},${cy})(${round1(loop.radius)},0,360)`;
  switch (loop.kind) {
    case 'photon':
      return `  \\PhotonArc${circle}{${PHOTON_AMPLITUDE}}{${photonWiggleCountForLength(loopPathLength(loop))}}`;
    case 'gluon':
      return `  \\GluonArc${circle}{${GLUON_AMPLITUDE}}{${gluonWindingCountForLength(loopPathLength(loop))}}`;
    case 'scalar':
      return `  \\DashCArc${circle}{${SCALAR_DASH_SIZE}}`;
    case 'ghost':
      return `  \\DashCArc${circle}{${GHOST_DASH_SIZE}}`;
    case 'fermion':
      if (!loop.arrow) return `  \\CArc${circle}`;
      // A non-reversed loop runs clockwise on screen; the y-flip into
      // axodraw's frame keeps the visual direction, and clockwise there
      // needs \ArrowArcn.
      return loop.reversed ? `  \\ArrowArc${circle}` : `  \\ArrowArcn${circle}`;
  }
}

function diagramBounds(elements: DiagramElement[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const element of elements) {
    if (element.type === 'propagator') {
      include(element.x1, element.y1);
      include(element.x2, element.y2);
      const arc = arcFromBend(element);
      if (arc) {
        // Conservative: include the arc apex.
        const apexAngle = arc.startAngle + arc.sweep / 2;
        include(arc.cx + arc.radius * Math.cos(apexAngle), arc.cy + arc.radius * Math.sin(apexAngle));
      }
    } else if (element.type === 'loop') {
      include(element.cx - element.radius, element.cy - element.radius);
      include(element.cx + element.radius, element.cy + element.radius);
    } else {
      include(element.x, element.y);
    }
  }
  return { minX, minY, maxX, maxY };
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
