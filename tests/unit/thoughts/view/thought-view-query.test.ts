import { describe, expect, it } from 'vitest';
import {
  buildThoughtViewHref,
  DEFAULT_THOUGHT_VIEW_QUERY,
  isFilteredThoughtView,
  parseThoughtViewQuery,
} from '../../../../src/features/thoughts/view/thought-view-query';

function parse(queryString: string, viewerIsAdmin = true) {
  return parseThoughtViewQuery(new URLSearchParams(queryString), viewerIsAdmin);
}

describe('parseThoughtViewQuery', () => {
  it('defaults to newest first with no filters', () => {
    expect(parse('')).toStrictEqual(DEFAULT_THOUGHT_VIEW_QUERY);
  });

  it('reads sort, tag, visibility, and a trimmed search', () => {
    expect(parse('sort=oldest&tag=ai&visibility=private&q=%20field%20theory%20')).toStrictEqual({
      sort: 'oldest',
      tag: 'ai',
      visibility: 'private',
      search: 'field theory',
    });
  });

  it('falls back to defaults for unknown values and blank tags', () => {
    expect(parse('sort=random&visibility=secret&tag=%20%20')).toStrictEqual(DEFAULT_THOUGHT_VIEW_QUERY);
  });

  it('ignores the visibility filter for non-admin viewers', () => {
    expect(parse('visibility=private', false).visibility).toBe('all');
  });
});

describe('isFilteredThoughtView', () => {
  it.each([
    { queryString: '', expected: false },
    { queryString: 'sort=oldest', expected: false },
    { queryString: 'tag=ai', expected: true },
    { queryString: 'visibility=public', expected: true },
    { queryString: 'q=idea', expected: true },
  ])('is $expected for "$queryString"', ({ queryString, expected }) => {
    expect(isFilteredThoughtView(parse(queryString))).toBe(expected);
  });
});

describe('buildThoughtViewHref', () => {
  it('links to the bare page for the default view', () => {
    expect(buildThoughtViewHref(DEFAULT_THOUGHT_VIEW_QUERY)).toBe('/thoughts/');
  });

  it('keeps the current query and applies the change', () => {
    const current = parse('sort=recently-edited&q=ai');

    expect(buildThoughtViewHref(current, { tag: 'life & work' })).toBe(
      '/thoughts/?sort=recently-edited&tag=life+%26+work&q=ai',
    );
    expect(buildThoughtViewHref(current, { sort: 'newest', search: '', visibility: 'private' })).toBe(
      '/thoughts/?visibility=private',
    );
  });
});
