import katex from 'katex';

/**
 * Convert label text to HTML, rendering $...$ segments with KaTeX and
 * escaping everything else. An unmatched trailing $ is shown literally.
 */
export function labelHtml(text: string): string {
  const parts: string[] = [];
  const pattern = /\$([^$]+)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    try {
      parts.push(katex.renderToString(match[1], { throwOnError: true }));
    } catch {
      parts.push(escapeHtml(match[0]));
    }
    lastIndex = match.index + match[0].length;
  }
  parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
