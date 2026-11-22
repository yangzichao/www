import type { MarkdownHeading } from 'astro';

export function tocHeadingsOf(headings: MarkdownHeading[]): MarkdownHeading[] {
  return headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
}

export function shouldShowToc(headings: MarkdownHeading[]): boolean {
  return tocHeadingsOf(headings).length > 1;
}
