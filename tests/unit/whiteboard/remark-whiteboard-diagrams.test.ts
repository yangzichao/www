import type { Root } from 'mdast';
import { describe, expect, it } from 'vitest';
import { remarkWhiteboardDiagrams } from '../../../src/markdown/whiteboard/remark-whiteboard-diagrams';

const position = (line: number) => ({ start: { line, column: 1 }, end: { line: line + 3, column: 4 } });

describe('remarkWhiteboardDiagrams', () => {
  it('replaces mermaid code blocks anywhere in the tree with whiteboard SVG and leaves other code alone', async () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'code', lang: 'mermaid', value: 'flowchart LR\n  A --> B' },
        { type: 'code', lang: 'ts', value: 'const a = 1;' },
        { type: 'blockquote', children: [{ type: 'code', lang: 'mermaid', value: 'sequenceDiagram\n  A->>B: hi' }] },
        { type: 'paragraph', children: [{ type: 'text', value: 'prose' }] },
      ],
    };

    await remarkWhiteboardDiagrams()(tree, {});

    const [flowchart, code, quote, paragraph] = tree.children;
    const quotedDiagram = quote?.type === 'blockquote' ? quote.children[0] : undefined;

    expect(flowchart?.type).toBe('html');
    expect(flowchart?.type === 'html' ? flowchart.value : '').toMatch(
      /^<figure class="whiteboard-diagram" data-diagram-type="flowchart".*<title id="wb-[0-9a-z]+-0-title">/,
    );
    expect(code).toStrictEqual({ type: 'code', lang: 'ts', value: 'const a = 1;' });
    expect(quotedDiagram?.type === 'html' ? quotedDiagram.value : '').toContain('data-diagram-type="sequence"');
    expect(paragraph).toMatchObject({ type: 'paragraph' });
  });

  it('points syntax errors at the markdown file and line', async () => {
    const tree: Root = {
      type: 'root',
      children: [{ type: 'code', lang: 'mermaid', value: 'flowchart LR\n  A --> B\n  end', position: position(10) }],
    };

    await expect(remarkWhiteboardDiagrams()(tree, { path: 'posts/demo.md' })).rejects.toThrow(
      'posts/demo.md:13: `end` without an open `subgraph`',
    );
  });

  it('still names the file when the code block has no position', async () => {
    const tree: Root = { type: 'root', children: [{ type: 'code', lang: 'mermaid', value: 'pie' }] };

    await expect(remarkWhiteboardDiagrams()(tree, {})).rejects.toThrow(
      'markdown: Diagram line 1: only `flowchart` and `sequenceDiagram` diagrams are supported',
    );
  });
});
