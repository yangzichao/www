import type { EditorState } from '../editor-state';

const NUDGE_DISTANCE = 1;
const NUDGE_DISTANCE_FAST = 10;

/**
 * Global shortcuts: Delete/Backspace removes the selection, Cmd/Ctrl+Z
 * undoes, Shift+Cmd/Ctrl+Z (or Ctrl+Y) redoes, Cmd/Ctrl+D duplicates,
 * arrow keys nudge the selection (Shift = bigger steps), Escape deselects.
 */
export function installKeyboardShortcuts(state: EditorState): void {
  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    const modifier = event.metaKey || event.ctrlKey;

    if (event.key.startsWith('Arrow') && state.selectedId) {
      event.preventDefault();
      const step = event.shiftKey ? NUDGE_DISTANCE_FAST : NUDGE_DISTANCE;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      state.nudgeSelected(dx, dy);
      return;
    }
    if (modifier && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      state.duplicateSelected();
      return;
    }
    if (modifier && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) state.redo();
      else state.undo();
      return;
    }
    if (modifier && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      state.redo();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      state.deleteSelected();
      return;
    }
    if (event.key === 'Escape') {
      state.selectedId = null;
      state.notifyChange();
    }
  });
}
