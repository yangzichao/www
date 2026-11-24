import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveMarkdownEditor } from '../../../../src/features/posts/editor/live-markdown/LiveMarkdownEditor';
import { appendToMarkdownEditor, findMarkdownEditorView } from '../../support/live-markdown-editor';

function renderLiveEditor(markdown: string, onMarkdownChange = vi.fn<(markdown: string) => void>()) {
  const view = render(
    <LiveMarkdownEditor
      markdown={markdown}
      onMarkdownChange={onMarkdownChange}
      accessibleLabel="Body"
      placeholderText="Start writing"
    />,
  );
  return { ...view, onMarkdownChange };
}

describe('LiveMarkdownEditor', () => {
  it('exposes a labelled multiline textbox and shows the placeholder when empty', () => {
    renderLiveEditor('');
    const textbox = screen.getByRole('textbox', { name: 'Body' });

    expect(textbox).toHaveAttribute('aria-multiline', 'true');
    expect(textbox).toHaveAttribute('spellcheck', 'true');
    expect(screen.getByText('Start writing')).toBeInTheDocument();
  });

  it('reports every edit with the full markdown', () => {
    const { onMarkdownChange } = renderLiveEditor('Hello');

    appendToMarkdownEditor(' world', 'Body');

    expect(onMarkdownChange).toHaveBeenLastCalledWith('Hello world');
  });

  it('follows markdown changed from outside without echoing unchanged values', () => {
    const { rerender, onMarkdownChange } = renderLiveEditor('First');
    const props = { onMarkdownChange, accessibleLabel: 'Body', placeholderText: 'Start writing' };

    rerender(<LiveMarkdownEditor markdown="First" {...props} />);

    expect(onMarkdownChange).not.toHaveBeenCalled();

    rerender(<LiveMarkdownEditor markdown="Second" {...props} />);

    expect(findMarkdownEditorView('Body').state.doc.toString()).toBe('Second');
  });

  it('renders markdown live inside the editor', () => {
    const { container } = renderLiveEditor('Intro\n\n## Heading\n\nInline $a^2$ math.');

    expect(container.querySelector('.cm-live-heading-2')).toHaveTextContent('Heading');
    expect(container.querySelector('.cm-live-math-inline .katex')).toBeInTheDocument();
  });

  it('tears the editor down on unmount', () => {
    const { unmount, container } = renderLiveEditor('Bye');
    const view = findMarkdownEditorView('Body');

    unmount();

    expect(container.querySelector('.cm-editor')).toBeNull();
    expect(() => {
      view.dispatch({ changes: { from: 0, insert: 'x' } });
    }).not.toThrow();
  });
});
