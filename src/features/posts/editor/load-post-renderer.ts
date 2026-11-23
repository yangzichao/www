import type { RenderedPost } from '../rendering/render-post-markdown';

export async function renderMarkdownInBrowser(markdown: string): Promise<RenderedPost> {
  const { renderPostMarkdown } = await import('../rendering/render-post-markdown');
  return renderPostMarkdown(markdown);
}
