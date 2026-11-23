import { describe, expect, it } from 'vitest';
import {
  buildContentViewHref,
  DEFAULT_CONTENT_VIEW_QUERY,
  isFilteredContentView,
  parseContentViewQuery,
  type ContentViewQuery,
} from '../../../src/features/content-view/content-view-query';

const BASE_PATH = '/notes/';

function hrefFor(query: ContentViewQuery, changes?: Partial<ContentViewQuery>) {
  return buildContentViewHref(BASE_PATH, query, changes);
}

function parse(queryString: string, viewerIsAdmin = true) {
  return parseContentViewQuery(new URLSearchParams(queryString), viewerIsAdmin);
}

describe('parseContentViewQuery', () => {
  it('defaults to newest first with no filters', () => {
    expect(parse('')).toStrictEqual(DEFAULT_CONTENT_VIEW_QUERY);
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
    expect(parse('sort=random&visibility=secret&tag=%20%20')).toStrictEqual(DEFAULT_CONTENT_VIEW_QUERY);
  });

  it('ignores the visibility filter for non-admin viewers', () => {
    expect(parse('visibility=private', false).visibility).toBe('all');
  });
});

describe('isFilteredContentView', () => {
  it.each([
    { queryString: '', expected: false },
    { queryString: 'sort=oldest', expected: false },
    { queryString: 'tag=ai', expected: true },
    { queryString: 'visibility=public', expected: true },
    { queryString: 'q=idea', expected: true },
  ])('is $expected for "$queryString"', ({ queryString, expected }) => {
    expect(isFilteredContentView(parse(queryString))).toBe(expected);
  });
});

describe('buildContentViewHref', () => {
  it('links to the bare page for the default view', () => {
    expect(hrefFor(DEFAULT_CONTENT_VIEW_QUERY)).toBe('/notes/');
  });

  it('keeps the current query and applies the change', () => {
    const current = parse('sort=recently-edited&q=ai');

    expect(hrefFor(current, { tag: 'life & work' })).toBe('/notes/?sort=recently-edited&tag=life+%26+work&q=ai');
    expect(hrefFor(current, { sort: 'newest', search: '', visibility: 'private' })).toBe('/notes/?visibility=private');
  });
});
