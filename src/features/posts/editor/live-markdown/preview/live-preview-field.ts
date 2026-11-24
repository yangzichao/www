import { syntaxTree } from '@codemirror/language';
import { StateField, type Transaction } from '@codemirror/state';
import { type DecorationSet, EditorView } from '@codemirror/view';
import { buildLivePreviewDecorations } from './build-live-preview-decorations';
import { editorFocusField } from './editor-focus-field';

function needsRebuild(transaction: Transaction): boolean {
  return (
    transaction.docChanged ||
    transaction.selection !== undefined ||
    transaction.state.field(editorFocusField) !== transaction.startState.field(editorFocusField) ||
    syntaxTree(transaction.state) !== syntaxTree(transaction.startState)
  );
}

export const livePreviewField = StateField.define<DecorationSet>({
  create: buildLivePreviewDecorations,
  update(decorations, transaction) {
    return needsRebuild(transaction) ? buildLivePreviewDecorations(transaction.state) : decorations;
  },
  provide: (field) => [editorFocusField, EditorView.decorations.from(field)],
});
