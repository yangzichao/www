import type { PostHeading } from '../features/posts/rendering/post-heading';

export function tocHeadingsOf(headings: readonly PostHeading[]): PostHeading[] {
  return headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
}

export function shouldShowToc(headings: readonly PostHeading[]): boolean {
  return tocHeadingsOf(headings).length > 1;
}
