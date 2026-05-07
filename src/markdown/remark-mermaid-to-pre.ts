/**
 * Lightweight remark plugin: convert ```mermaid code blocks into raw
 * `<pre class="mermaid">…</pre>` HTML so that a tiny client script can
 * render them at runtime via the Mermaid library.
 *
 * Why hand-rolled instead of `rehype-mermaid`? `rehype-mermaid` (via
 * `mermaid-isomorphic`) imports `playwright` at module-load time, which
 * forces a ~100 MB Chromium download even when using the lightweight
 * `pre-mermaid` strategy. This plugin keeps the build dependencies
 * minimal at the cost of client-side rendering, which is acceptable for
 * a low-traffic personal site.
 */

type RemarkNode = {
  type: string;
  lang?: string | null;
  value?: string;
  meta?: string | null;
  children?: RemarkNode[];
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function remarkMermaidToPre() {
  return (tree: RemarkNode) => {
    const transform = (node: RemarkNode): void => {
      if (!node.children) return;
      for (const child of node.children) {
        if (child.type === 'code' && child.lang === 'mermaid') {
          child.type = 'html';
          child.value = `<pre class="mermaid">${escapeHtml(child.value ?? '')}</pre>`;
          delete child.lang;
          delete child.meta;
        } else {
          transform(child);
        }
      }
    };
    transform(tree);
  };
}
