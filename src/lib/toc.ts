import type { MarkdownHeading } from 'astro';

/**
 * The headings a post's table of contents shows: h2/h3 only — deeper
 * levels are noise in a narrow rail. A TOC with a single entry is
 * useless, hence the shared "more than one" rule.
 */
export function tocHeadingsOf(headings: MarkdownHeading[]): MarkdownHeading[] {
  return headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
}

export function shouldShowToc(headings: MarkdownHeading[]): boolean {
  return tocHeadingsOf(headings).length > 1;
}
