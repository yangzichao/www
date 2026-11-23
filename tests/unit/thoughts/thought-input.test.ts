import { describe, expect, it } from 'vitest';
import { parseThoughtSubmission } from '../../../src/features/thoughts/thought-input';
import {
  MAX_THOUGHT_BODY_LENGTH,
  MAX_THOUGHT_TAG_COUNT,
  MAX_THOUGHT_TAG_LENGTH,
} from '../../../src/features/thoughts/thought-limits';
import { normalizeTags, splitTagInput } from '../../../src/features/thoughts/thought-tags';

describe('parseThoughtSubmission', () => {
  it('trims the body and normalizes tags', () => {
    expect(
      parseThoughtSubmission({ body: '  An idea.  ', tags: ['#ai', ' ai ', 'life', 7], isPublic: false }),
    ).toStrictEqual({ body: 'An idea.', tags: ['ai', 'life'], isPublic: false });
  });

  it('treats missing tags as none', () => {
    expect(parseThoughtSubmission({ body: 'An idea.', tags: 'ai', isPublic: true })).toStrictEqual({
      body: 'An idea.',
      tags: [],
      isPublic: true,
    });
  });

  it.each([
    { payload: null, expectedError: 'Request body must be a JSON object.' },
    { payload: 'text', expectedError: 'Request body must be a JSON object.' },
    { payload: { body: '   ' }, expectedError: 'Thought cannot be empty.' },
    { payload: { body: 42 }, expectedError: 'Thought cannot be empty.' },
    {
      payload: { body: 'x'.repeat(MAX_THOUGHT_BODY_LENGTH + 1) },
      expectedError: `Thought must be at most ${MAX_THOUGHT_BODY_LENGTH} characters.`,
    },
    { payload: { body: 'An idea.' }, expectedError: 'isPublic must be true or false.' },
    { payload: { body: 'An idea.', isPublic: 'yes' }, expectedError: 'isPublic must be true or false.' },
  ])('rejects $payload', ({ payload, expectedError }) => {
    expect(parseThoughtSubmission(payload)).toBe(expectedError);
  });
});

describe('thought tags', () => {
  it('caps the tag count and tag length', () => {
    const manyTags = Array.from({ length: MAX_THOUGHT_TAG_COUNT + 2 }, (_, index) => `tag${index}`);

    expect(normalizeTags(manyTags)).toHaveLength(MAX_THOUGHT_TAG_COUNT);
    expect(normalizeTags(['y'.repeat(MAX_THOUGHT_TAG_LENGTH + 5)])).toStrictEqual(['y'.repeat(MAX_THOUGHT_TAG_LENGTH)]);
  });

  it('splits free-form tag input on commas, Chinese commas, and spaces', () => {
    expect(splitTagInput('ai, #systems，life  physics,,')).toStrictEqual(['ai', 'systems', 'life', 'physics']);
    expect(splitTagInput('   ')).toStrictEqual([]);
  });
});
