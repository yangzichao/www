interface RemarkNode {
  type: string;
  lang?: string | null;
  value?: string;
  meta?: string | null;
  children?: RemarkNode[];
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
