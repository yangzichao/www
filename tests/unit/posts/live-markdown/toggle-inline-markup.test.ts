import { EditorSelection, EditorState, type Transaction } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { toggleInlineMarkup } from '../../../../src/features/posts/editor/live-markdown/editing/toggle-inline-markup';

function runToggle(doc: string, from: number, to: number, marker: string): EditorState {
  const dispatched: Transaction[] = [];
  const state = EditorState.create({ doc, selection: EditorSelection.range(from, to) });
  const handled = toggleInlineMarkup(marker)({
    state,
    dispatch: (transaction) => {
      dispatched.push(transaction);
    },
  });
  const [transaction] = dispatched;
  if (!handled || !transaction) throw new Error('toggleInlineMarkup did not dispatch');
  return transaction.state;
}

describe('toggleInlineMarkup', () => {
  it('wraps the selection and keeps the same words selected', () => {
    const state = runToggle('make bold now', 5, 9, '**');

    expect(state.doc.toString()).toBe('make **bold** now');
    expect(state.sliceDoc(state.selection.main.from, state.selection.main.to)).toBe('bold');
  });

  it('unwraps a selection that is already wrapped', () => {
    const state = runToggle('make *it* now', 6, 8, '*');

    expect(state.doc.toString()).toBe('make it now');
    expect(state.sliceDoc(state.selection.main.from, state.selection.main.to)).toBe('it');
  });

  it('puts the cursor between new markers when nothing is selected', () => {
    const state = runToggle('ab', 1, 1, '**');

    expect(state.doc.toString()).toBe('a****b');
    expect(state.selection.main.head).toBe(3);
  });
});
