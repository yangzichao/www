import { describe, expect, it } from 'vitest';
import { renderDiagramMarkup } from '../../../../src/features/posts/editor/live-markdown/widgets/render-diagram-markup';

describe('renderDiagramMarkup', () => {
  it('renders a diagram once and reuses the result for the same source', async () => {
    const source = 'flowchart LR\n  a --> b';
    const first = renderDiagramMarkup(source);

    expect(renderDiagramMarkup(source)).toBe(first);
    await expect(first).resolves.toContain('<figure class="whiteboard-diagram"');
  });

  it('forgets failed renders so a corrected retry can run', async () => {
    const first = renderDiagramMarkup('pie title Nope');

    await expect(first).rejects.toThrow('only `flowchart` and `sequenceDiagram` diagrams are supported');
    expect(renderDiagramMarkup('pie title Nope')).not.toBe(first);
    await expect(renderDiagramMarkup('pie title Nope')).rejects.toThrow('only `flowchart`');
  });
});
