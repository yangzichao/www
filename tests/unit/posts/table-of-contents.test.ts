import { describe, expect, it } from 'vitest';
import { shouldShowToc, tocHeadingsOf } from '../../../src/lib/toc';

const HEADINGS = [
  { depth: 1, slug: 'title', text: 'Title' },
  { depth: 2, slug: 'a', text: 'A' },
  { depth: 3, slug: 'a-1', text: 'A' },
  { depth: 4, slug: 'deep', text: 'Deep' },
];

describe('table of contents', () => {
  it('keeps only second- and third-level headings', () => {
    expect(tocHeadingsOf(HEADINGS).map((heading) => heading.slug)).toStrictEqual(['a', 'a-1']);
  });

  it('shows the table only when it has more than one entry', () => {
    expect(shouldShowToc(HEADINGS)).toBe(true);
    expect(shouldShowToc(HEADINGS.slice(0, 2))).toBe(false);
  });
});
