import GithubSlugger from 'github-slugger';
import type { Element, Nodes, Root } from 'hast';
import { hastTextContent } from './hast-text-content';
import type { PostHeading } from './post-heading';

const HEADING_TAG_PATTERN = /^h([1-6])$/;

function headingDepth(element: Element): number | null {
  const match = HEADING_TAG_PATTERN.exec(element.tagName);
  return match ? Number(match[1]) : null;
}

function visitElements(node: Nodes, visit: (element: Element) => void): void {
  if (node.type === 'element') visit(node);
  if ('children' in node) for (const child of node.children) visitElements(child, visit);
}

export function rehypeCollectHeadings(collected: PostHeading[]) {
  return () => (tree: Root) => {
    const slugger = new GithubSlugger();
    visitElements(tree, (element) => {
      const depth = headingDepth(element);
      if (depth === null) return;
      const text = hastTextContent(element);
      const slug = slugger.slug(text);
      element.properties.id = slug;
      collected.push({ depth, slug, text });
    });
  };
}
