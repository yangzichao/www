import { describe, expect, it } from 'vitest';
import {
  categoryLabel,
  categoryOfId,
  formatPostDate,
  getAdjacentPostsInCategory,
  getPublishedPosts,
  groupByCategory,
  type Post,
} from '../../../src/lib/posts';
import { shouldShowToc, tocHeadingsOf } from '../../../src/lib/toc';
import { setCollectionEntries } from '../../support/astro-content-stub';

function post(id: string, date: string, draft = false): Post {
  return { id, collection: 'blog', data: { title: id, date: new Date(date), draft, tags: [] } };
}

describe('post categories', () => {
  it('derives the category from the first id segment', () => {
    expect(categoryOfId('physics/halo/note')).toBe('physics');
    expect(categoryOfId('standalone')).toBe('misc');
  });

  it('labels known categories and title-cases unknown ones', () => {
    expect(categoryLabel('ai')).toBe('AI');
    expect(categoryLabel('system-design')).toBe('System Design');
    expect(categoryLabel('quantum-field-theory')).toBe('Quantum Field Theory');
  });

  it('groups posts in the curated category order, unknown categories alphabetically before misc', () => {
    const groups = groupByCategory([
      post('standalone', '2026-01-01'),
      post('zoology/a', '2026-01-01'),
      post('physics/a', '2026-01-01'),
      post('astronomy/a', '2026-01-01'),
      post('system-design/a', '2026-01-01'),
      post('physics/b', '2026-01-02'),
    ]);

    expect(groups.map((group) => [group.slug, group.posts.map((entry) => entry.id)])).toStrictEqual([
      ['system-design', ['system-design/a']],
      ['physics', ['physics/a', 'physics/b']],
      ['astronomy', ['astronomy/a']],
      ['misc', ['standalone']],
      ['zoology', ['zoology/a']],
    ]);
  });
});

describe('getAdjacentPostsInCategory', () => {
  const posts = [
    post('physics/newest', '2026-03-01'),
    post('ai/between', '2026-02-15'),
    post('physics/middle', '2026-02-01'),
    post('physics/oldest', '2026-01-01'),
  ];

  it('links neighbours within the same category only', () => {
    const { newer, older } = getAdjacentPostsInCategory(posts, 'physics/middle');

    expect(newer?.id).toBe('physics/newest');
    expect(older?.id).toBe('physics/oldest');
  });

  it('has no neighbour past either end or for an unknown post', () => {
    expect(getAdjacentPostsInCategory(posts, 'physics/newest').newer).toBeNull();
    expect(getAdjacentPostsInCategory(posts, 'physics/oldest').older).toBeNull();
    expect(getAdjacentPostsInCategory(posts, 'physics/missing')).toStrictEqual({ newer: null, older: null });
  });
});

describe('content collections', () => {
  it('returns published posts newest first and filters out drafts', async () => {
    setCollectionEntries('blog', [
      post('a/old', '2026-01-01'),
      post('a/draft', '2026-06-01', true),
      post('a/new', '2026-03-01'),
    ]);

    await expect(getPublishedPosts().then((result) => result.map((entry) => entry.id))).resolves.toStrictEqual([
      'a/new',
      'a/old',
    ]);
  });
});

describe('dates', () => {
  it('formats date-only frontmatter on its UTC calendar day', () => {
    expect(formatPostDate(new Date('2026-05-02'))).toBe('May 2, 2026');
  });
});

describe('table of contents', () => {
  const headings = [
    { depth: 1, slug: 'title', text: 'Title' },
    { depth: 2, slug: 'a', text: 'A' },
    { depth: 3, slug: 'a-1', text: 'A.1' },
    { depth: 4, slug: 'a-1-x', text: 'A.1.x' },
  ];

  it('keeps only h2 and h3 headings', () => {
    expect(tocHeadingsOf(headings).map((heading) => heading.slug)).toStrictEqual(['a', 'a-1']);
  });

  it('shows a table of contents only with more than one entry', () => {
    expect(shouldShowToc(headings)).toBe(true);
    expect(shouldShowToc(headings.slice(0, 2))).toBe(false);
  });
});
