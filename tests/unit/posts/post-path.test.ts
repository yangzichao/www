import { describe, expect, it } from 'vitest';
import {
  categoryOfPostPath,
  isValidPostPath,
  postPathFromPagePath,
  postUrl,
} from '../../../src/features/posts/post-path';

describe('post paths', () => {
  it.each(['physics/11be', 'system-design/postgresql', 'system-design/postgresql/search-and-indexing'])(
    'accepts %s',
    (path) => {
      expect(isValidPostPath(path)).toBe(true);
    },
  );

  it.each(['physics', 'Physics/post', 'physics/post/', '/physics/post', 'physics/my_post', 'a/-b', 'a/b--c', ''])(
    'rejects %j',
    (path) => {
      expect(isValidPostPath(path)).toBe(false);
    },
  );

  it('rejects paths longer than the limit', () => {
    expect(isValidPostPath(`a/${'b'.repeat(200)}`)).toBe(false);
  });

  it('reads the category from the first path segment', () => {
    expect(categoryOfPostPath('system-design/postgresql/search')).toBe('system-design');
  });

  it('builds the public URL with a trailing slash', () => {
    expect(postUrl('physics/11be')).toBe('/blog/physics/11be/');
  });

  it.each([
    ['/blog/physics/11be/', 'physics/11be'],
    ['/blog/physics/11be', null],
    ['/notes/physics/11be/', null],
    ['/blog/physics/', null],
    ['/blog/../etc/passwd/', null],
  ])('maps the page path %s to the post path %j', (pagePath, expected) => {
    expect(postPathFromPagePath(pagePath)).toBe(expected);
  });
});
