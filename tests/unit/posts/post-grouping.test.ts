import { describe, expect, it } from 'vitest';
import { categoryLabel, categoryRank } from '../../../src/features/posts/post-categories';
import { adjacentPostsInCategory, groupByCategory } from '../../../src/features/posts/post-grouping';
import { buildPostSummary } from '../../support/post-fixtures';

const NEWEST_PHYSICS = buildPostSummary({ id: 'p1', path: 'physics/newest' });
const OLDER_PHYSICS = buildPostSummary({ id: 'p2', path: 'physics/older' });
const OLDEST_PHYSICS = buildPostSummary({ id: 'p3', path: 'physics/oldest' });
const SYSTEM_DESIGN = buildPostSummary({ id: 's1', path: 'system-design/kv-store' });
const COOKING = buildPostSummary({ id: 'c1', path: 'home-cooking/rice' });
const BAKING = buildPostSummary({ id: 'b1', path: 'baking/bread' });

describe('post categories', () => {
  it('labels known categories and title-cases unknown ones', () => {
    expect(categoryLabel('ai')).toBe('AI');
    expect(categoryLabel('system-design')).toBe('System Design');
    expect(categoryLabel('home-cooking')).toBe('Home Cooking');
  });

  it('ranks unknown categories after the known ones', () => {
    expect(categoryRank('system-design')).toBe(0);
    expect(categoryRank('home-cooking')).toBe(6);
  });
});

describe('groupByCategory', () => {
  it('groups posts in known order, then unknown categories alphabetically, keeping post order', () => {
    const groups = groupByCategory([COOKING, NEWEST_PHYSICS, BAKING, SYSTEM_DESIGN, OLDER_PHYSICS]);

    expect(groups.map((group) => [group.category, group.label, group.posts.map((post) => post.id)])).toStrictEqual([
      ['system-design', 'System Design', ['s1']],
      ['physics', 'Physics', ['p1', 'p2']],
      ['baking', 'Baking', ['b1']],
      ['home-cooking', 'Home Cooking', ['c1']],
    ]);
  });
});

describe('adjacentPostsInCategory', () => {
  const newestFirst = [NEWEST_PHYSICS, SYSTEM_DESIGN, OLDER_PHYSICS, OLDEST_PHYSICS];

  it('finds the newer and older posts in the same category', () => {
    expect(adjacentPostsInCategory(newestFirst, 'physics/older')).toStrictEqual({
      newer: NEWEST_PHYSICS,
      older: OLDEST_PHYSICS,
    });
  });

  it('returns null at the ends of the category', () => {
    expect(adjacentPostsInCategory(newestFirst, 'physics/newest').newer).toBeNull();
    expect(adjacentPostsInCategory(newestFirst, 'physics/oldest').older).toBeNull();
  });

  it('returns no neighbors for a post that is not listed', () => {
    expect(adjacentPostsInCategory(newestFirst, 'physics/hidden')).toStrictEqual({ newer: null, older: null });
  });
});
