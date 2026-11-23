import { describe, expect, it } from 'vitest';
import { normalizePostTags, splitPostTagInput } from '../../../src/features/posts/post-tags';

describe('post tags', () => {
  it('trims, strips hashes, drops empties, and deduplicates', () => {
    expect(normalizePostTags([' #ai ', 'ai', '', '##physics', '#'])).toStrictEqual(['ai', 'physics']);
  });

  it('keeps at most ten tags of at most forty characters', () => {
    const manyTags = Array.from({ length: 12 }, (_, index) => `tag${index}`);

    expect(normalizePostTags(manyTags)).toHaveLength(10);
    expect(normalizePostTags(['x'.repeat(50)])).toStrictEqual(['x'.repeat(40)]);
  });

  it('splits typed input on ASCII and full-width commas', () => {
    expect(splitPostTagInput('ai, physics，life,,')).toStrictEqual(['ai', 'physics', 'life']);
  });
});
