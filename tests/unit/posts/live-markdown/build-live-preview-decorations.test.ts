import { describe, expect, it } from 'vitest';
import { describeLivePreviewOf } from './support/describe-live-preview';

describe('live preview decorations', () => {
  it('hides heading and inline markup away from the cursor and styles headings by level', () => {
    expect(describeLivePreviewOf('|\n## Section ##\n\nSome **bold**, *it*, ~~gone~~, `code`.')).toStrictEqual([
      'line 2 .cm-live-heading cm-live-heading-2',
      'hide "## "',
      'hide " ##"',
      'hide "**"',
      'hide "**"',
      'hide "*"',
      'hide "*"',
      'hide "~~"',
      'hide "~~"',
      'hide "`"',
      'hide "`"',
      'mark "`code`" .cm-live-inline-code',
    ]);
  });

  it('reveals the markup of the construct the cursor touches', () => {
    expect(describeLivePreviewOf('## Sec|tion\n\nSome **bold**')).toStrictEqual([
      'line 1 .cm-live-heading cm-live-heading-2',
      'hide "**"',
      'hide "**"',
    ]);
    expect(describeLivePreviewOf('Some **bold**| here')).toStrictEqual([]);
    expect(describeLivePreviewOf('Title\n=====\n|')).toStrictEqual(['line 1 .cm-live-heading cm-live-heading-1']);
  });

  it('collapses links to their text and renders images and inline math', () => {
    expect(
      describeLivePreviewOf('|\n[site](https://x.dev "T") and ![cat](/cat.png) and $a^2$ and $$b$$ and ![](no-url'),
    ).toStrictEqual([
      'hide "["',
      'hide "]"',
      'hide "("',
      'hide "https://x.dev"',
      'hide "\\"T\\""',
      'hide ")"',
      'image /cat.png alt=cat over "![cat](/cat.png)"',
      'math(inline) a^2 over "$a^2$"',
      'math(inline) b over "$$b$$"',
    ]);
    expect(describeLivePreviewOf('[si|te](https://x.dev) ![c|at](/cat.png) $a|$')).toStrictEqual([]);
  });

  it('pairs inline math dollars the way remark-math does', () => {
    expect(describeLivePreviewOf('|\nPrice $5 and $ 6, \\$7, $a\\$b$ end, $$ no close')).toStrictEqual([
      'math(inline) 5 and  over "$5 and $"',
      'math(inline) a\\ over "$a\\\\$"',
    ]);
  });

  it('draws quotes, bullets, and rules, revealing them line by line', () => {
    expect(describeLivePreviewOf('|\n> quote\n> more\n\n- one\n- two\n\n1. first\n\n---\n')).toStrictEqual([
      'line 2 .cm-live-blockquote',
      'hide "> "',
      'line 3 .cm-live-blockquote',
      'hide "> "',
      'symbol .cm-live-bullet over "-"',
      'symbol .cm-live-bullet over "-"',
      'symbol .cm-live-horizontal-rule over "---"',
    ]);
    expect(describeLivePreviewOf('> qu|ote\n>more\n\n- o|ne\n\n--|-')).toStrictEqual([
      'line 1 .cm-live-blockquote',
      'line 2 .cm-live-blockquote',
      'hide ">"',
    ]);
  });

  it('renders diagram fences as a block until the cursor enters them', () => {
    expect(
      describeLivePreviewOf(
        '|\n```mermaid\nflowchart LR\n  a --> b\n```\n\n```ts\nconst x = 1;\n```\n\n```mermaid\n```',
      ),
    ).toStrictEqual([
      'block diagram "flowchart LR\\n  a --> b" over "```mermaid\\nflowchart LR\\n  a --> b\\n```"',
      'line 7 .cm-live-code-block',
      'line 8 .cm-live-code-block',
      'line 9 .cm-live-code-block',
      'block diagram "" over "```mermaid\\n```"',
    ]);
    expect(describeLivePreviewOf('```mermaid\nflowchart LR\n  a -|-> b\n```')).toStrictEqual([
      'line 1 .cm-live-code-block',
      'line 2 .cm-live-code-block',
      'line 3 .cm-live-code-block',
      'line 4 .cm-live-code-block',
    ]);
  });

  it('renders display math blocks with remark-math fence rules', () => {
    expect(
      describeLivePreviewOf('|\n$$ meta\nE = mc^2\n$$$\n\nx $$\n\n$$\nnot closed $$\n$$\n\n$$\nunterminated'),
    ).toStrictEqual([
      'block math(block) E = mc^2 over "$$ meta\\nE = mc^2\\n$$$"',
      'block math(block) not closed $$ over "$$\\nnot closed $$\\n$$"',
      'block math(block) unterminated over "$$\\nunterminated"',
    ]);
    expect(describeLivePreviewOf('$$\nE = |mc^2\n$$')).toStrictEqual([
      'line 1 .cm-live-math-block-source',
      'line 2 .cm-live-math-block-source',
      'line 3 .cm-live-math-block-source',
    ]);
  });
});
