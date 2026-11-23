import { describe, expect, it } from 'vitest';
import { thoughtSearchableText } from '../../../src/features/thoughts/thought-view';

describe('thoughtSearchableText', () => {
  it('searches the body and the tags', () => {
    expect(
      thoughtSearchableText({
        id: 'thought-1',
        body: 'Ship small.',
        tags: ['work', 'life'],
        createdAt: '2026-11-22T00:00:00.000Z',
        updatedAt: null,
        timestampPrecision: 'exact',
        isPublic: true,
      }),
    ).toBe('Ship small.\nwork\nlife');
  });
});
