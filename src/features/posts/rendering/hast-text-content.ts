import type { Nodes } from 'hast';

export function hastTextContent(node: Nodes): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) return node.children.map((child) => hastTextContent(child)).join('');
  return '';
}
