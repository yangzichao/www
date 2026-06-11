/**
 * Core data model for the Feynman diagram editor.
 *
 * Curved propagators are modeled as circular arcs ("bend" = signed
 * perpendicular offset of the arc apex from the straight chord), because
 * circular arcs map exactly onto axodraw's \PhotonArc / \GluonArc / \CArc
 * commands — a bezier model would not export cleanly.
 */

export type PropagatorKind = 'fermion' | 'photon' | 'gluon' | 'scalar' | 'ghost';

export const PROPAGATOR_KINDS: PropagatorKind[] = [
  'fermion',
  'photon',
  'gluon',
  'scalar',
  'ghost',
];

export interface PropagatorElement {
  id: string;
  type: 'propagator';
  kind: PropagatorKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Signed apex offset perpendicular to the chord; 0 = straight line. */
  bend: number;
  /** Draw a direction arrow at the midpoint (conventional for fermions). */
  arrow: boolean;
}

export interface LoopElement {
  id: string;
  type: 'loop';
  kind: PropagatorKind;
  cx: number;
  cy: number;
  radius: number;
  arrow: boolean;
  /** Flips the traversal direction (and thus the arrow) of the loop. */
  reversed: boolean;
}

export interface VertexElement {
  id: string;
  type: 'vertex';
  x: number;
  y: number;
  radius: number;
}

export interface LabelElement {
  id: string;
  type: 'label';
  x: number;
  y: number;
  /** Raw text; LaTeX like $\mu$ is kept verbatim for the axodraw export. */
  text: string;
}

export type DiagramElement = PropagatorElement | LoopElement | VertexElement | LabelElement;

export type ToolName = 'select' | PropagatorKind | 'loop' | 'vertex' | 'label';

export interface DiagramDocument {
  elements: DiagramElement[];
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const GRID_SIZE = 10;

let elementIdCounter = 0;

export function nextElementId(): string {
  elementIdCounter += 1;
  return `el-${elementIdCounter}-${elementIdCounter.toString(36)}`;
}

/** Re-seed the id counter after loading a saved document, to avoid collisions. */
export function reseedElementIds(elements: DiagramElement[]): void {
  for (const element of elements) {
    const match = /^el-(\d+)-/.exec(element.id);
    if (match) elementIdCounter = Math.max(elementIdCounter, Number(match[1]));
  }
}
