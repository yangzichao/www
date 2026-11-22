import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveComment,
  deleteComment,
  insertComment,
  listCommentsForPage,
  listPendingComments,
  listRecentPublishedComments,
  type NewComment,
} from '../../../src/features/comments/comment-store';
import { resetDatabase } from '../support/database';

const PAGE = '/blog/physics/test-post/';
const OTHER_PAGE = '/blog/meta/second-test-post/';

function newComment(overrides: Partial<NewComment> = {}): NewComment {
  return {
    pagePath: PAGE,
    body: 'Nice post',
    authorKind: 'github',
    authorName: 'friendly-visitor',
    githubLogin: 'friendly-visitor',
    githubAvatarUrl: 'https://avatars.test/u/1001',
    status: 'published',
    ...overrides,
  };
}

async function insertAt(isoTimestamp: string, overrides: Partial<NewComment> = {}) {
  vi.setSystemTime(new Date(isoTimestamp));
  return insertComment(env.DB, newComment(overrides));
}

describe('comment store', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await resetDatabase();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the stored comment with a generated id and timestamp', async () => {
    const { id, ...stored } = await insertAt('2026-11-20T10:00:00.000Z', { body: 'Hello' });

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(stored).toStrictEqual({
      pagePath: PAGE,
      body: 'Hello',
      authorKind: 'github',
      authorName: 'friendly-visitor',
      githubLogin: 'friendly-visitor',
      githubAvatarUrl: 'https://avatars.test/u/1001',
      status: 'published',
      createdAt: '2026-11-20T10:00:00.000Z',
    });
  });

  it('lists only published comments for a page, oldest first', async () => {
    await insertAt('2026-11-20T12:00:00.000Z', { body: 'second' });
    await insertAt('2026-11-20T10:00:00.000Z', { body: 'first' });
    await insertAt('2026-11-20T11:00:00.000Z', { body: 'hidden', status: 'pending', authorKind: 'anonymous' });
    await insertAt('2026-11-20T09:00:00.000Z', { body: 'elsewhere', pagePath: OTHER_PAGE });

    const comments = await listCommentsForPage(env.DB, PAGE, { includePending: false });

    expect(comments.map((comment) => comment.body)).toStrictEqual(['first', 'second']);
  });

  it('includes pending comments for moderators', async () => {
    await insertAt('2026-11-20T10:00:00.000Z', { body: 'published' });
    await insertAt('2026-11-20T11:00:00.000Z', { body: 'pending', status: 'pending' });

    const comments = await listCommentsForPage(env.DB, PAGE, { includePending: true });

    expect(comments.map((comment) => comment.body)).toStrictEqual(['published', 'pending']);
  });

  it('lists the moderation queue across pages, oldest first', async () => {
    await insertAt('2026-11-20T12:00:00.000Z', { body: 'later', status: 'pending' });
    await insertAt('2026-11-20T10:00:00.000Z', { body: 'earlier', status: 'pending', pagePath: OTHER_PAGE });
    await insertAt('2026-11-20T11:00:00.000Z', { body: 'published' });

    const pending = await listPendingComments(env.DB);

    expect(pending.map((comment) => comment.body)).toStrictEqual(['earlier', 'later']);
  });

  it('lists recent published comments newest first, capped by the limit', async () => {
    await insertAt('2026-11-20T10:00:00.000Z', { body: 'oldest' });
    await insertAt('2026-11-20T11:00:00.000Z', { body: 'middle' });
    await insertAt('2026-11-20T12:00:00.000Z', { body: 'newest' });
    await insertAt('2026-11-20T13:00:00.000Z', { body: 'pending', status: 'pending' });

    const recent = await listRecentPublishedComments(env.DB, 2);

    expect(recent.map((comment) => comment.body)).toStrictEqual(['newest', 'middle']);
  });

  it('approves a pending comment exactly once', async () => {
    const pending = await insertAt('2026-11-20T10:00:00.000Z', { status: 'pending' });

    await expect(approveComment(env.DB, pending.id)).resolves.toBe(true);
    await expect(approveComment(env.DB, pending.id)).resolves.toBe(false);
    await expect(listCommentsForPage(env.DB, PAGE, { includePending: false })).resolves.toHaveLength(1);
  });

  it('reports whether a delete removed anything', async () => {
    const stored = await insertAt('2026-11-20T10:00:00.000Z');

    await expect(deleteComment(env.DB, stored.id)).resolves.toBe(true);
    await expect(deleteComment(env.DB, stored.id)).resolves.toBe(false);
    await expect(deleteComment(env.DB, 'missing')).resolves.toBe(false);
  });
});
