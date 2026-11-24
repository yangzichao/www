import { syntaxTree } from '@codemirror/language';
import { StateField, type Transaction } from '@codemirror/state';
import { type DecorationSet, EditorView } from '@codemirror/view';
import { buildLivePreviewDecorations } from './build-live-preview-decorations';

function needsRebuild(transaction: Transaction): boolean {
  return (
    transaction.docChanged ||
    transaction.selection !== undefined ||
    syntaxTree(transaction.state) !== syntaxTree(transaction.startState)
  );
}

export const livePreviewField = StateField.define<DecorationSet>({
  create: buildLivePreviewDecorations,
  update(decorations, transaction) {
    return needsRebuild(transaction) ? buildLivePreviewDecorations(transaction.state) : decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});
