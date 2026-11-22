import { marked } from 'marked';

export function renderThoughtMarkdown(body: string): string {
  return marked.parse(body, { async: false });
}
