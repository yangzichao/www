import { describe, expect, it } from 'vitest';
import { joinPostPath, splitPostPath } from '../../../../src/features/posts/editor/path/post-path-parts';

describe('post path parts', () => {
  it('splits a path at its first slash and joins it back', () => {
    expect(splitPostPath('physics/eft/notes')).toStrictEqual({ category: 'physics', slug: 'eft/notes' });
    expect(splitPostPath('physics')).toStrictEqual({ category: 'physics', slug: '' });
    expect(splitPostPath('')).toStrictEqual({ category: '', slug: '' });

    for (const path of ['physics/eft/notes', 'physics/', '/fresh', '']) {
      expect(joinPostPath(splitPostPath(path))).toBe(path);
    }
  });
});
