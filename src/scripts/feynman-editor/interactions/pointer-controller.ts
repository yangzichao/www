import type {
  DiagramElement,
  LoopElement,
  PropagatorElement,
  PropagatorKind,
} from '../diagram-types';
import { CANVAS_HEIGHT, CANVAS_WIDTH, GRID_SIZE, nextElementId } from '../diagram-types';
import type { EditorState } from '../editor-state';
import type { Point } from '../geometry';
import {
  distance,
  distanceToBasePath,
  distanceToLoopOutline,
  signedOffsetFromChord,
  snapToGrid,
} from '../geometry';
import { openLabelInput } from './label-input';

const MIN_PROPAGATOR_LENGTH = 8;
const MIN_LOOP_RADIUS = 10;
const ENDPOINT_SNAP_RADIUS = 9;
const BEND_SNAP_TO_STRAIGHT = 6;
const DEFAULT_VERTEX_RADIUS = 2.5;

type DragMode =
  | { kind: 'draw'; draft: PropagatorElement | LoopElement }
  | {
      kind: 'move';
      elementId: string;
      grabOffset: Point;
      original: DiagramElement;
      snapshotTaken: boolean;
    }
  | { kind: 'endpoint'; elementId: string; which: 1 | 2; snapshotTaken: boolean }
  | { kind: 'bend'; elementId: string; snapshotTaken: boolean }
  | { kind: 'radius'; elementId: string; snapshotTaken: boolean };

export class PointerController {
  /** In-progress propagator or loop, rendered on top of committed elements. */
  draftElement: PropagatorElement | LoopElement | null = null;

  private drag: DragMode | null = null;

  constructor(
    private readonly svg: SVGSVGElement,
    private readonly canvasWrapper: HTMLElement,
    private readonly state: EditorState
  ) {
    svg.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    svg.addEventListener('pointermove', (e) => this.onPointerMove(e));
    svg.addEventListener('pointerup', (e) => this.onPointerUp(e));
    svg.addEventListener('dblclick', (e) => this.onDoubleClick(e));
  }

  private toCanvasPoint(event: PointerEvent | MouseEvent): Point {
    const rect = this.svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return {
      x: Math.max(0, Math.min(CANVAS_WIDTH, x)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT, y)),
    };
  }

  /** Snap to nearby endpoints/vertices first (to connect lines), then to the grid. */
  private snapPoint(raw: Point, ignoreElementId?: string): Point {
    let best: Point | null = null;
    let bestDistance = ENDPOINT_SNAP_RADIUS;
    for (const element of this.state.elements) {
      if (element.id === ignoreElementId) continue;
      const candidates: Point[] =
        element.type === 'propagator'
          ? [
              { x: element.x1, y: element.y1 },
              { x: element.x2, y: element.y2 },
            ]
          : element.type === 'vertex'
            ? [{ x: element.x, y: element.y }]
            : [];
      for (const candidate of candidates) {
        const d = distance(raw, candidate);
        if (d < bestDistance) {
          bestDistance = d;
          best = candidate;
        }
      }
    }
    if (best) return { ...best };
    if (!this.state.snapEnabled) return raw;
    return { x: snapToGrid(raw.x, GRID_SIZE), y: snapToGrid(raw.y, GRID_SIZE) };
  }

  private onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.svg.setPointerCapture(event.pointerId);
    const point = this.toCanvasPoint(event);
    const tool = this.state.activeTool;

    if (tool === 'select') {
      this.beginSelectDrag(event, point);
      return;
    }

    if (tool === 'vertex') {
      const snapped = this.snapPoint(point);
      this.state.pushUndoSnapshot();
      this.state.elements.push({
        id: nextElementId(),
        type: 'vertex',
        x: snapped.x,
        y: snapped.y,
        radius: DEFAULT_VERTEX_RADIUS,
      });
      this.state.persist();
      this.state.notifyChange();
      return;
    }

    if (tool === 'label') {
      openLabelInput(this.canvasWrapper, this.svg, point, '', (text) => {
        if (!text.trim()) return;
        this.state.pushUndoSnapshot();
        this.state.elements.push({ id: nextElementId(), type: 'label', x: point.x, y: point.y, text });
        this.state.persist();
        this.state.notifyChange();
      });
      return;
    }

    if (tool === 'loop') {
      // Drag from the loop's center outward to set its radius.
      const center = this.snapPoint(point);
      this.draftElement = {
        id: nextElementId(),
        type: 'loop',
        kind: this.state.lastPropagatorKind,
        cx: center.x,
        cy: center.y,
        radius: 0,
        arrow: this.state.lastPropagatorKind === 'fermion',
        reversed: false,
      };
      this.drag = { kind: 'draw', draft: this.draftElement };
      this.state.notifyChange();
      return;
    }

    // Propagator tools: start drawing a draft line.
    const start = this.snapPoint(point);
    this.draftElement = {
      id: nextElementId(),
      type: 'propagator',
      kind: tool as PropagatorKind,
      x1: start.x,
      y1: start.y,
      x2: start.x,
      y2: start.y,
      bend: 0,
      arrow: tool === 'fermion',
    };
    this.drag = { kind: 'draw', draft: this.draftElement };
    this.state.notifyChange();
  }

  private beginSelectDrag(event: PointerEvent, point: Point): void {
    // Handles of the currently selected element take priority.
    const handleName = (event.target as Element)?.getAttribute?.('data-handle');
    const selected = this.state.selectedElement;
    if (handleName && selected?.type === 'propagator') {
      if (handleName === 'endpoint-1' || handleName === 'endpoint-2') {
        this.drag = {
          kind: 'endpoint',
          elementId: selected.id,
          which: handleName === 'endpoint-1' ? 1 : 2,
          snapshotTaken: false,
        };
      } else {
        this.drag = { kind: 'bend', elementId: selected.id, snapshotTaken: false };
      }
      return;
    }
    if (handleName === 'radius' && selected?.type === 'loop') {
      this.drag = { kind: 'radius', elementId: selected.id, snapshotTaken: false };
      return;
    }

    const hit = this.hitTest(point);
    this.state.selectedId = hit?.id ?? null;
    if (hit) {
      const anchor =
        hit.type === 'propagator'
          ? { x: hit.x1, y: hit.y1 }
          : hit.type === 'loop'
            ? { x: hit.cx, y: hit.cy }
            : { x: hit.x, y: hit.y };
      this.drag = {
        kind: 'move',
        elementId: hit.id,
        grabOffset: { x: point.x - anchor.x, y: point.y - anchor.y },
        original: JSON.parse(JSON.stringify(hit)),
        snapshotTaken: false,
      };
    }
    this.state.notifyChange();
  }

  private hitTest(point: Point): DiagramElement | null {
    // Topmost (last drawn) first; labels and vertices before long propagators.
    const reversed = [...this.state.elements].reverse();
    for (const element of reversed) {
      if (element.type === 'label' && Math.abs(point.x - element.x) < 35 && Math.abs(point.y - element.y) < 15) {
        return element;
      }
      if (element.type === 'vertex' && distance(point, element) < element.radius + 6) {
        return element;
      }
    }
    for (const element of reversed) {
      if (element.type === 'propagator' && distanceToBasePath(element, point) < 7) {
        return element;
      }
      if (element.type === 'loop' && distanceToLoopOutline(element, point) < 7) {
        return element;
      }
    }
    return null;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.drag) return;
    const point = this.toCanvasPoint(event);

    switch (this.drag.kind) {
      case 'draw': {
        const draft = this.drag.draft;
        if (draft.type === 'loop') {
          const raw = distance(point, { x: draft.cx, y: draft.cy });
          draft.radius = this.state.snapEnabled ? snapToGrid(raw, GRID_SIZE) : raw;
        } else {
          const end = this.snapPoint(point);
          draft.x2 = end.x;
          draft.y2 = end.y;
        }
        this.state.notifyChange();
        break;
      }
      case 'move': {
        const element = this.state.findElement(this.drag.elementId);
        if (!element) break;
        this.takeDragSnapshotOnce();
        const targetX = point.x - this.drag.grabOffset.x;
        const targetY = point.y - this.drag.grabOffset.y;
        const snappedX = this.state.snapEnabled ? snapToGrid(targetX, GRID_SIZE) : targetX;
        const snappedY = this.state.snapEnabled ? snapToGrid(targetY, GRID_SIZE) : targetY;
        const original = this.drag.original;
        if (element.type === 'propagator' && original.type === 'propagator') {
          const dx = snappedX - original.x1;
          const dy = snappedY - original.y1;
          element.x1 = original.x1 + dx;
          element.y1 = original.y1 + dy;
          element.x2 = original.x2 + dx;
          element.y2 = original.y2 + dy;
        } else if (element.type === 'loop') {
          element.cx = snappedX;
          element.cy = snappedY;
        } else if (element.type !== 'propagator') {
          element.x = snappedX;
          element.y = snappedY;
        }
        this.state.notifyChange();
        break;
      }
      case 'endpoint': {
        const element = this.state.findElement(this.drag.elementId);
        if (element?.type !== 'propagator') break;
        this.takeDragSnapshotOnce();
        const snapped = this.snapPoint(point, element.id);
        if (this.drag.which === 1) {
          element.x1 = snapped.x;
          element.y1 = snapped.y;
        } else {
          element.x2 = snapped.x;
          element.y2 = snapped.y;
        }
        this.state.notifyChange();
        break;
      }
      case 'bend': {
        const element = this.state.findElement(this.drag.elementId);
        if (element?.type !== 'propagator') break;
        this.takeDragSnapshotOnce();
        const offset = signedOffsetFromChord(element, point);
        element.bend = Math.abs(offset) < BEND_SNAP_TO_STRAIGHT ? 0 : offset;
        this.state.notifyChange();
        break;
      }
      case 'radius': {
        const element = this.state.findElement(this.drag.elementId);
        if (element?.type !== 'loop') break;
        this.takeDragSnapshotOnce();
        const raw = distance(point, { x: element.cx, y: element.cy });
        const snapped = this.state.snapEnabled ? snapToGrid(raw, GRID_SIZE) : raw;
        element.radius = Math.max(MIN_LOOP_RADIUS, snapped);
        this.state.notifyChange();
        break;
      }
    }
  }

  private takeDragSnapshotOnce(): void {
    if (!this.drag || this.drag.kind === 'draw' || this.drag.snapshotTaken) return;
    this.drag.snapshotTaken = true;
    this.state.pushUndoSnapshot();
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.drag?.kind === 'draw') {
      const draft = this.drag.draft;
      const isBigEnough =
        draft.type === 'loop'
          ? draft.radius >= MIN_LOOP_RADIUS
          : Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) >= MIN_PROPAGATOR_LENGTH;
      if (isBigEnough) {
        this.state.pushUndoSnapshot();
        this.state.elements.push(draft);
        this.state.selectedId = draft.id;
        this.state.activeTool = 'select';
        this.state.persist();
      }
      this.draftElement = null;
    } else if (this.drag) {
      this.state.persist();
    }
    this.drag = null;
    this.svg.releasePointerCapture(event.pointerId);
    this.state.notifyChange();
  }

  private onDoubleClick(event: MouseEvent): void {
    const point = this.toCanvasPoint(event);
    const hit = this.hitTest(point);
    if (hit?.type !== 'label') return;
    openLabelInput(this.canvasWrapper, this.svg, hit, hit.text, (text) => {
      this.state.pushUndoSnapshot();
      if (text.trim()) {
        hit.text = text;
      } else {
        this.state.elements = this.state.elements.filter((el) => el.id !== hit.id);
        this.state.selectedId = null;
      }
      this.state.persist();
      this.state.notifyChange();
    });
  }
}
