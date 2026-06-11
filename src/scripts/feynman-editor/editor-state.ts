import type {
  DiagramDocument,
  DiagramElement,
  PropagatorKind,
  ToolName,
} from './diagram-types';
import { nextElementId, reseedElementIds } from './diagram-types';

const STORAGE_KEY = 'feynman-editor-document-v1';
const UNDO_LIMIT = 100;

export class EditorState {
  elements: DiagramElement[] = [];
  selectedId: string | null = null;
  activeTool: ToolName = 'fermion';
  snapEnabled = true;
  /** Kind used by the loop tool; follows the last propagator tool picked. */
  lastPropagatorKind: PropagatorKind = 'fermion';

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private changeListeners: (() => void)[] = [];

  onChange(listener: () => void): void {
    this.changeListeners.push(listener);
  }

  notifyChange(): void {
    for (const listener of this.changeListeners) listener();
  }

  findElement(id: string): DiagramElement | undefined {
    return this.elements.find((element) => element.id === id);
  }

  get selectedElement(): DiagramElement | undefined {
    return this.selectedId ? this.findElement(this.selectedId) : undefined;
  }

  /** Snapshot the current document before a mutation, enabling undo. */
  pushUndoSnapshot(): void {
    this.undoStack.push(JSON.stringify(this.elements));
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): void {
    const snapshot = this.undoStack.pop();
    if (snapshot === undefined) return;
    this.redoStack.push(JSON.stringify(this.elements));
    this.elements = JSON.parse(snapshot);
    this.selectedId = null;
    this.persist();
    this.notifyChange();
  }

  redo(): void {
    const snapshot = this.redoStack.pop();
    if (snapshot === undefined) return;
    this.undoStack.push(JSON.stringify(this.elements));
    this.elements = JSON.parse(snapshot);
    this.selectedId = null;
    this.persist();
    this.notifyChange();
  }

  deleteSelected(): void {
    if (!this.selectedId) return;
    this.pushUndoSnapshot();
    this.elements = this.elements.filter((element) => element.id !== this.selectedId);
    this.selectedId = null;
    this.persist();
    this.notifyChange();
  }

  /** Clone the selection with a small offset and select the clone. */
  duplicateSelected(): void {
    const selected = this.selectedElement;
    if (!selected) return;
    this.pushUndoSnapshot();
    const clone = JSON.parse(JSON.stringify(selected)) as DiagramElement;
    clone.id = nextElementId();
    translateElement(clone, 15, 15);
    this.elements.push(clone);
    this.selectedId = clone.id;
    this.persist();
    this.notifyChange();
  }

  /**
   * Reverse the traversal direction of the selected propagator or loop,
   * flipping its arrow while keeping the drawn geometry identical
   * (endpoints swap, so the bend sign must flip too).
   */
  flipSelectedDirection(): void {
    const selected = this.selectedElement;
    if (selected?.type !== 'propagator' && selected?.type !== 'loop') return;
    this.pushUndoSnapshot();
    if (selected.type === 'propagator') {
      [selected.x1, selected.x2] = [selected.x2, selected.x1];
      [selected.y1, selected.y2] = [selected.y2, selected.y1];
      selected.bend = -selected.bend;
    } else {
      selected.reversed = !selected.reversed;
    }
    this.persist();
    this.notifyChange();
  }

  setSelectedKind(kind: PropagatorKind): void {
    const selected = this.selectedElement;
    if (selected?.type !== 'propagator' && selected?.type !== 'loop') return;
    if (selected.kind === kind) return;
    this.pushUndoSnapshot();
    selected.kind = kind;
    this.persist();
    this.notifyChange();
  }

  nudgeSelected(dx: number, dy: number): void {
    const selected = this.selectedElement;
    if (!selected) return;
    this.pushUndoSnapshot();
    translateElement(selected, dx, dy);
    this.persist();
    this.notifyChange();
  }

  /** Replace the whole document (JSON import); throws on malformed input. */
  replaceDocument(elements: DiagramElement[]): void {
    this.pushUndoSnapshot();
    this.elements = elements;
    reseedElementIds(this.elements);
    this.selectedId = null;
    this.persist();
    this.notifyChange();
  }

  clearAll(): void {
    if (this.elements.length === 0) return;
    this.pushUndoSnapshot();
    this.elements = [];
    this.selectedId = null;
    this.persist();
    this.notifyChange();
  }

  persist(): void {
    try {
      const document: DiagramDocument = { elements: this.elements };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    } catch {
      // Storage may be unavailable (private mode, quota) — drawing still works.
    }
  }

  restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const document = JSON.parse(raw) as DiagramDocument;
      if (Array.isArray(document.elements)) {
        this.elements = document.elements;
        reseedElementIds(this.elements);
      }
    } catch {
      // Corrupted saved state — start fresh rather than crash.
    }
  }
}

function translateElement(element: DiagramElement, dx: number, dy: number): void {
  if (element.type === 'propagator') {
    element.x1 += dx;
    element.y1 += dy;
    element.x2 += dx;
    element.y2 += dy;
  } else if (element.type === 'loop') {
    element.cx += dx;
    element.cy += dy;
  } else {
    element.x += dx;
    element.y += dy;
  }
}
