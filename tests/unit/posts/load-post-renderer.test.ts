import { describe, expect, it } from 'vitest';
import { renderMarkdownInBrowser } from '../../../src/features/posts/editor/load-post-renderer';

describe('renderMarkdownInBrowser', () => {
  it('loads the renderer on demand and renders with it', async () => {
    await expect(renderMarkdownInBrowser('## Hi')).resolves.toStrictEqual({
      html: '<h2 id="hi">Hi</h2>',
      headings: [{ depth: 2, slug: 'hi', text: 'Hi' }],
    });
  });
});
