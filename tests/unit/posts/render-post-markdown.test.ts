import { describe, expect, it } from 'vitest';
import { renderPostMarkdown } from '../../../src/features/posts/rendering/render-post-markdown';

describe('renderPostMarkdown', () => {
  it('collects headings with unique GitHub-style slugs', async () => {
    const { html, headings } = await renderPostMarkdown('# Title\n\n## Setup\n\n### Setup\n\n## Ship *it*');

    expect(headings).toStrictEqual([
      { depth: 1, slug: 'title', text: 'Title' },
      { depth: 2, slug: 'setup', text: 'Setup' },
      { depth: 3, slug: 'setup-1', text: 'Setup' },
      { depth: 2, slug: 'ship-it', text: 'Ship it' },
    ]);
    expect(html).toContain('<h3 id="setup-1">Setup</h3>');
  });

  it('leaves raw HTML untouched and out of heading text', async () => {
    const { html, headings } = await renderPostMarkdown('<h2>Raw</h2>\n\n## Plain <br> text');

    expect(headings).toStrictEqual([{ depth: 2, slug: 'plain--text', text: 'Plain  text' }]);
    expect(html).toContain('<h2>Raw</h2>');
  });

  it('renders GFM tables, smart quotes, and KaTeX math', async () => {
    const { html } = await renderPostMarkdown('"Quoted" -- yes\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n$E = mc^2$');

    expect(html).toContain('“Quoted” — yes');
    expect(html).toContain('<table>');
    expect(html).toContain('class="katex"');
  });

  it('highlights known languages and resolves aliases', async () => {
    const { html } = await renderPostMarkdown('```ts\nconst answer = 42;\n```\n\n```PY\nprint(1)\n```');

    expect(html).toContain('class="shiki github-light"');
    expect(html).toContain('data-language="typescript"');
    expect(html).toContain('data-language="python"');
    expect(html).toContain('style="color:#D73A49">const</span>');
  });

  it('falls back to plain text for missing or unknown languages', async () => {
    const { html } = await renderPostMarkdown('```\nplain\n```\n\n```brainfuck\n+++\n```');

    expect(html.match(/data-language="text"/g)).toHaveLength(2);
  });

  it('leaves a raw pre block without a code element alone', async () => {
    const { html } = await renderPostMarkdown('<pre>as typed</pre>');

    expect(html).toBe('<pre>as typed</pre>');
  });

  it('turns whiteboard fences into diagrams', async () => {
    const { html } = await renderPostMarkdown('```mermaid\nflowchart LR\n  a[Client] --> b[Server]\n```');

    expect(html).toContain('<figure class="whiteboard-diagram"');
    expect(html).toContain('Client');
  });
});
