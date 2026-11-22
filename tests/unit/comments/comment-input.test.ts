import { describe, expect, it } from 'vitest';
import { parseCommentSubmission } from '../../../src/features/comments/comment-input';
import { MAX_AUTHOR_NAME_LENGTH, MAX_COMMENT_BODY_LENGTH } from '../../../src/features/comments/comment-limits';
import { formatCommentDate } from '../../../src/features/comments/components/format-comment-date';
import { turnstileSiteKeyFor } from '../../../src/features/comments/turnstile-site-key';

describe('parseCommentSubmission', () => {
  it('trims the body and name and keeps the token', () => {
    expect(
      parseCommentSubmission({ pagePath: '/blog/a/', body: '  Hello  ', authorName: '  Ada  ', turnstileToken: 'tok' }),
    ).toStrictEqual({ pagePath: '/blog/a/', body: 'Hello', authorName: 'Ada', turnstileToken: 'tok' });
  });

  it('defaults missing optional fields', () => {
    expect(parseCommentSubmission({ body: 'Hello' })).toStrictEqual({
      pagePath: '',
      body: 'Hello',
      authorName: 'Anonymous',
      turnstileToken: null,
    });
  });

  it('caps the author name length', () => {
    const parsed = parseCommentSubmission({ body: 'Hi', authorName: 'x'.repeat(MAX_AUTHOR_NAME_LENGTH + 10) });

    expect(typeof parsed === 'string' ? parsed : parsed.authorName).toHaveLength(MAX_AUTHOR_NAME_LENGTH);
  });

  it.each([
    { name: 'null', payload: null, error: 'Request body must be a JSON object.' },
    { name: 'a string', payload: 'hello', error: 'Request body must be a JSON object.' },
    { name: 'a blank body', payload: { body: '   ' }, error: 'Comment cannot be empty.' },
    { name: 'a non-string body', payload: { body: 42 }, error: 'Comment cannot be empty.' },
    {
      name: 'an oversized body',
      payload: { body: 'x'.repeat(MAX_COMMENT_BODY_LENGTH + 1) },
      error: `Comment must be at most ${MAX_COMMENT_BODY_LENGTH} characters.`,
    },
  ])('rejects $name', ({ payload, error }) => {
    expect(parseCommentSubmission(payload)).toBe(error);
  });

  it('accepts a body at exactly the length limit', () => {
    expect(parseCommentSubmission({ body: 'x'.repeat(MAX_COMMENT_BODY_LENGTH) })).not.toBeTypeOf('string');
  });
});

describe('turnstileSiteKeyFor', () => {
  it('uses the production key only on the production hostname', () => {
    expect(turnstileSiteKeyFor('zichaoyang.com')).toBe('0x4AAAAAAGMytzfiXGKF5A9C');
    expect(turnstileSiteKeyFor('localhost')).toBe('1x00000000000000000000AA');
    expect(turnstileSiteKeyFor('www.zichaoyang.com')).toBe('1x00000000000000000000AA');
  });
});

describe('formatCommentDate', () => {
  it('formats an ISO timestamp as a short US date', () => {
    expect(formatCommentDate('2026-11-20T10:00:00.000Z')).toBe('Nov 20, 2026');
  });
});
