import { EditorView } from '@codemirror/view';
import { act, screen } from '@testing-library/react';

export function findMarkdownEditorView(accessibleName = 'Markdown'): EditorView {
  const view = EditorView.findFromDOM(screen.getByRole('textbox', { name: accessibleName }));
  if (!view) throw new Error(`No editor view behind the ${accessibleName} textbox`);
  return view;
}

export function appendToMarkdownEditor(text: string, accessibleName = 'Markdown'): void {
  const view = findMarkdownEditorView(accessibleName);
  act(() => {
    view.dispatch({ changes: { from: view.state.doc.length, insert: text }, userEvent: 'input.type' });
  });
}
