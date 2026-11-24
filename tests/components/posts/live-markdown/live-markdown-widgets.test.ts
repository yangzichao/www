import type { EditorView } from '@codemirror/view';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiagramWidget } from '../../../../src/features/posts/editor/live-markdown/widgets/diagram-widget';
import { ImageWidget } from '../../../../src/features/posts/editor/live-markdown/widgets/image-widget';
import { MathWidget } from '../../../../src/features/posts/editor/live-markdown/widgets/math-widget';
import { renderDiagramMarkup } from '../../../../src/features/posts/editor/live-markdown/widgets/render-diagram-markup';
import {
  BULLET_WIDGET,
  TextSymbolWidget,
} from '../../../../src/features/posts/editor/live-markdown/widgets/text-symbol-widget';

vi.mock(import('../../../../src/features/posts/editor/live-markdown/widgets/render-diagram-markup'), () => ({
  renderDiagramMarkup: vi.fn(),
}));

function fakeView() {
  const requestMeasure = vi.fn();
  return { view: { requestMeasure } as unknown as EditorView, requestMeasure };
}

describe('live markdown widgets', () => {
  it('renders inline and display math with KaTeX and lets clicks reach the editor', () => {
    const inline = new MathWidget('a^2', 'inline');
    const block = new MathWidget('\\frac{1}{2}', 'block');

    expect(inline.toDOM()).toMatchObject({ tagName: 'SPAN', className: 'cm-live-math cm-live-math-inline' });
    expect(block.toDOM().querySelector('.katex-display')).not.toBeNull();
    expect(new MathWidget('a^', 'inline').toDOM().querySelector('.katex-error')).not.toBeNull();
    expect(inline.eq(new MathWidget('a^2', 'inline'))).toBe(true);
    expect(inline.eq(new MathWidget('a^2', 'block'))).toBe(false);
    expect(inline.ignoreEvent()).toBe(false);
  });

  it('fills a diagram in once it renders and asks the editor to remeasure', async () => {
    vi.mocked(renderDiagramMarkup).mockResolvedValue('<figure class="whiteboard-diagram"></figure>');
    const { view, requestMeasure } = fakeView();
    const widget = new DiagramWidget('flowchart LR');
    const element = widget.toDOM(view);

    expect(element).toHaveTextContent('Rendering diagram…');

    await waitFor(() => {
      expect(element.dataset.diagramState).toBe('rendered');
    });

    expect(element.querySelector('.whiteboard-diagram')).not.toBeNull();
    expect(requestMeasure).toHaveBeenCalledExactlyOnceWith();
    expect(widget.eq(new DiagramWidget('flowchart LR'))).toBe(true);
    expect(widget.ignoreEvent()).toBe(false);
  });

  it('explains a diagram that failed to render', async () => {
    vi.mocked(renderDiagramMarkup).mockRejectedValueOnce(new Error('line 2: bad arrow'));
    vi.mocked(renderDiagramMarkup).mockRejectedValueOnce('odd');
    const { view } = fakeView();
    const explained = new DiagramWidget('flowchart LR\n  a -x b').toDOM(view);
    const generic = new DiagramWidget('graph').toDOM(view);

    await waitFor(() => {
      expect(explained).toHaveTextContent('line 2: bad arrow');
    });
    await waitFor(() => {
      expect(generic).toHaveTextContent('Could not render this diagram.');
    });

    expect(explained.dataset.diagramState).toBe('failed');
  });

  it('shows images and remeasures after they load', () => {
    const { view, requestMeasure } = fakeView();
    const widget = new ImageWidget('/cat.png', 'A cat');
    const image = widget.toDOM(view) as HTMLImageElement;

    expect(image).toHaveAttribute('src', '/cat.png');
    expect(image).toHaveAttribute('alt', 'A cat');

    image.dispatchEvent(new Event('load'));

    expect(requestMeasure).toHaveBeenCalledExactlyOnceWith();
    expect(widget.eq(new ImageWidget('/cat.png', 'A cat'))).toBe(true);
    expect(widget.eq(new ImageWidget('/dog.png', 'A cat'))).toBe(false);
    expect(widget.ignoreEvent()).toBe(false);
  });

  it('draws symbols such as list bullets', () => {
    expect(BULLET_WIDGET.toDOM()).toMatchObject({ className: 'cm-live-bullet', textContent: '•' });
    expect(BULLET_WIDGET.eq(new TextSymbolWidget('•', 'cm-live-bullet'))).toBe(true);
    expect(BULLET_WIDGET.eq(new TextSymbolWidget('◦', 'cm-live-bullet'))).toBe(false);
    expect(BULLET_WIDGET.ignoreEvent()).toBe(false);
  });
});
