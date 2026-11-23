import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTENT_VIEW_QUERY } from '../../../src/features/content-view/content-view-query';
import {
  filterPostsByCategory,
  listCategoryChoices,
  splitFeaturedPost,
} from '../../../src/features/posts/index-page/post-index-view';
import { buildPostSummary } from '../../support/post-fixtures';

const PHYSICS_POST = buildPostSummary({ id: 'p1', path: 'physics/newest' });
const LIFE_POST = buildPostSummary({ id: 'l1', path: 'life/attention' });
const OLDER_LIFE_POST = buildPostSummary({ id: 'l2', path: 'life/habits' });
const NEWEST_FIRST = [PHYSICS_POST, LIFE_POST, OLDER_LIFE_POST];

describe('listCategoryChoices', () => {
  it('counts posts per category in the site category order', () => {
    expect(listCategoryChoices(NEWEST_FIRST)).toStrictEqual([
      { category: 'physics', label: 'Physics', count: 1 },
      { category: 'life', label: 'Life', count: 2 },
    ]);
  });
});

describe('filterPostsByCategory', () => {
  it('keeps every post when no category is chosen', () => {
    expect(filterPostsByCategory(NEWEST_FIRST, null)).toStrictEqual(NEWEST_FIRST);
  });

  it('keeps only posts under the chosen category', () => {
    expect(filterPostsByCategory(NEWEST_FIRST, 'life').map((post) => post.id)).toStrictEqual(['l1', 'l2']);
  });
});

describe('splitFeaturedPost', () => {
  it('features the newest post on the default view', () => {
    expect(splitFeaturedPost(NEWEST_FIRST, DEFAULT_CONTENT_VIEW_QUERY)).toStrictEqual({
      featuredPost: PHYSICS_POST,
      gridPosts: [LIFE_POST, OLDER_LIFE_POST],
    });
  });

  it.each([
    { ...DEFAULT_CONTENT_VIEW_QUERY, sort: 'oldest' as const },
    { ...DEFAULT_CONTENT_VIEW_QUERY, category: 'life' },
    { ...DEFAULT_CONTENT_VIEW_QUERY, search: 'habits' },
  ])('shows a plain grid when the view is sorted or filtered: %o', (query) => {
    expect(splitFeaturedPost(NEWEST_FIRST, query)).toStrictEqual({ featuredPost: null, gridPosts: NEWEST_FIRST });
  });

  it('features nothing when there are no posts', () => {
    expect(splitFeaturedPost([], DEFAULT_CONTENT_VIEW_QUERY)).toStrictEqual({ featuredPost: null, gridPosts: [] });
  });
});
