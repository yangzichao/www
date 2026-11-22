import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newPostTemplate, slugFromTitle } from '../../../src/features/admin/new-post-template';
import {
  isEditablePostFilePath,
  postFilePathFor,
  postFileSummaryFor,
  publicUrlForPostFile,
} from '../../../src/features/admin/post-file-path';

describe('post file paths', () => {
  it.each([
    ['src/content/blog/physics/halo-nuclei.md', true],
    ['src/content/blog/system-design/a1.md', true],
    ['src/content/blog/top-level.md', false],
    ['src/content/blog/physics/nested/deep.md', false],
    ['src/content/blog/Physics/post.md', false],
    ['src/content/blog/physics/post.mdx', false],
    ['src/content/blog/../pages/index.md', false],
    ['src/pages/index.astro', false],
  ])('treats %j as editable: %j', (path, expected) => {
    expect(isEditablePostFilePath(path)).toBe(expected);
  });

  it('summarizes an editable path and rejects others', () => {
    expect(postFileSummaryFor('src/content/blog/physics/halo-nuclei.md')).toStrictEqual({
      path: 'src/content/blog/physics/halo-nuclei.md',
      category: 'physics',
      slug: 'halo-nuclei',
    });
    expect(postFileSummaryFor('src/pages/index.astro')).toBeNull();
  });

  it('maps between category/slug, repository path, and public URL', () => {
    const path = postFilePathFor('physics', 'halo-nuclei');

    expect(path).toBe('src/content/blog/physics/halo-nuclei.md');
    expect(publicUrlForPostFile(path)).toBe('/blog/physics/halo-nuclei/');
  });
});

describe('slugFromTitle', () => {
  it.each([
    ['Hello World', 'hello-world'],
    ['  Café  Déjà Vu  ', 'cafe-deja-vu'],
    ['SQL vs. NoSQL: a tiebreaker!', 'sql-vs-nosql-a-tiebreaker'],
    ['a -- b', 'a-b'],
    ['质子发射', ''],
  ])('slugifies %j as %j', (title, slug) => {
    expect(slugFromTitle(title)).toBe(slug);
  });
});

describe('newPostTemplate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-22T23:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a draft dated today in UTC with a safely quoted title', () => {
    expect(newPostTemplate('Say "hi": a post')).toBe(
      '---\ntitle: "Say \\"hi\\": a post"\ndate: 2026-11-22\ndescription: ""\ntags: []\ndraft: true\n---\n\n',
    );
  });
});
