import { StateEffect, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export const setEditorFocus = StateEffect.define<boolean>();

export const editorFocusField = StateField.define<boolean>({
  create: () => false,
  update(isFocused, transaction) {
    const focusChange = transaction.effects.findLast((effect) => effect.is(setEditorFocus));
    return focusChange ? focusChange.value : isFocused;
  },
  provide: () => EditorView.focusChangeEffect.of((_state, focusing) => setEditorFocus.of(focusing)),
});
