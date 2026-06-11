import type { PropagatorKind, ToolName } from './diagram-types';
import { PROPAGATOR_KINDS } from './diagram-types';
import { EditorState } from './editor-state';
import { exportToAxodraw } from './export/axodraw-exporter';
import { downloadDiagramAsJson, openDiagramJsonFile } from './export/json-io';
import { downloadDiagramAsPng } from './export/png-exporter';
import { downloadDiagramAsSvg } from './export/svg-exporter';
import { installKeyboardShortcuts } from './interactions/keyboard-shortcuts';
import { PointerController } from './interactions/pointer-controller';
import { renderDiagram } from './render/render-diagram';

export function initFeynmanEditor(): void {
  const svg = document.getElementById('feynman-canvas') as SVGSVGElement | null;
  const canvasWrapper = document.getElementById('feynman-canvas-wrapper');
  const latexOutput = document.getElementById('feynman-latex-output') as HTMLTextAreaElement | null;
  if (!svg || !canvasWrapper || !latexOutput) return;

  const state = new EditorState();
  state.restoreFromStorage();
  const pointerController = new PointerController(svg, canvasWrapper, state);
  installKeyboardShortcuts(state);

  const toolButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-tool]'));
  for (const button of toolButtons) {
    button.addEventListener('click', () => {
      const tool = button.dataset.tool as ToolName;
      state.activeTool = tool;
      if (PROPAGATOR_KINDS.includes(tool as PropagatorKind)) {
        state.lastPropagatorKind = tool as PropagatorKind;
      }
      state.selectedId = null;
      state.notifyChange();
    });
  }

  // --- Selection-dependent controls -------------------------------------
  const selectionControls = document.getElementById('feynman-selection-controls');
  const arrowToggle = document.getElementById('feynman-arrow-toggle') as HTMLInputElement | null;
  const kindSelect = document.getElementById('feynman-kind-select') as HTMLSelectElement | null;

  arrowToggle?.addEventListener('change', () => {
    const selected = state.selectedElement;
    if (selected?.type !== 'propagator' && selected?.type !== 'loop') return;
    state.pushUndoSnapshot();
    selected.arrow = arrowToggle.checked;
    state.persist();
    state.notifyChange();
  });

  kindSelect?.addEventListener('change', () => {
    state.setSelectedKind(kindSelect.value as PropagatorKind);
  });

  document
    .getElementById('feynman-flip-direction')
    ?.addEventListener('click', () => state.flipSelectedDirection());
  document
    .getElementById('feynman-duplicate')
    ?.addEventListener('click', () => state.duplicateSelected());
  document.getElementById('feynman-delete')?.addEventListener('click', () => state.deleteSelected());

  // --- Global actions -----------------------------------------------------
  const snapToggle = document.getElementById('feynman-snap-toggle') as HTMLInputElement | null;
  snapToggle?.addEventListener('change', () => {
    state.snapEnabled = snapToggle.checked;
  });

  document.getElementById('feynman-undo')?.addEventListener('click', () => state.undo());
  document.getElementById('feynman-redo')?.addEventListener('click', () => state.redo());
  document.getElementById('feynman-clear')?.addEventListener('click', () => {
    if (window.confirm('Clear the whole diagram?')) state.clearAll();
  });

  // --- Export / import ----------------------------------------------------
  document
    .getElementById('feynman-download-svg')
    ?.addEventListener('click', () => downloadDiagramAsSvg(state.elements));
  document
    .getElementById('feynman-download-png')
    ?.addEventListener('click', () => downloadDiagramAsPng(state.elements));
  document
    .getElementById('feynman-save-json')
    ?.addEventListener('click', () => downloadDiagramAsJson(state.elements));
  document
    .getElementById('feynman-load-json')
    ?.addEventListener('click', () =>
      openDiagramJsonFile((elements) => state.replaceDocument(elements))
    );

  const copyButton = document.getElementById('feynman-copy-latex');
  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(latexOutput.value);
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy LaTeX';
      }, 1500);
    } catch {
      latexOutput.select();
    }
  });

  // --- Render loop ----------------------------------------------------------
  const rerender = () => {
    const elements = pointerController.draftElement
      ? [...state.elements, pointerController.draftElement]
      : state.elements;
    renderDiagram(svg, elements, { selectedId: state.selectedId });

    for (const button of toolButtons) {
      button.classList.toggle('is-active', button.dataset.tool === state.activeTool);
    }

    const selected = state.selectedElement;
    const hasStrokeKind = selected?.type === 'propagator' || selected?.type === 'loop';
    if (selectionControls) selectionControls.style.display = hasStrokeKind ? '' : 'none';
    if (hasStrokeKind && arrowToggle && kindSelect) {
      arrowToggle.checked = selected.arrow;
      kindSelect.value = selected.kind;
    }

    latexOutput.value = exportToAxodraw(state.elements);
  };

  state.onChange(rerender);
  rerender();
}
