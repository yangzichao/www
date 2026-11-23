import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deletePost,
  findPostById,
  findPostByPath,
  insertPost,
  isPublicPostPath,
  listPostSummaries,
  listPostsWithBodies,
  PostPathTakenError,
  updatePost,
} from '../../../src/features/posts/store/post-store';
import { buildPostSubmission } from '../../support/post-fixtures';
import { deleteTestPosts } from '../support/database';

const FIXED_NOW = '2026-11-22T21:30:00.000Z';
const LATER = '2026-11-23T08:00:00.000Z';
const PUBLIC_ONLY = { includePrivate: false };
const EVERYONE = { includePrivate: true };

describe('post store', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(FIXED_NOW));
    await deleteTestPosts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inserts a post with an exact creation time and no edit time', async () => {
    const post = await insertPost(env.DB, buildPostSubmission());

    expect(post.id).toMatch(/^[\da-f-]{36}$/);
    expect(post).toStrictEqual({
      ...buildPostSubmission(),
      id: post.id,
      createdAt: FIXED_NOW,
      timestampPrecision: 'exact',
      updatedAt: null,
    });
    await expect(findPostById(env.DB, post.id)).resolves.toStrictEqual(post);
  });

  it('refuses a second post on the same path', async () => {
    await insertPost(env.DB, buildPostSubmission());

    await expect(insertPost(env.DB, buildPostSubmission())).rejects.toBeInstanceOf(PostPathTakenError);
  });

  it('stamps the edit time when the content changes', async () => {
    const original = await insertPost(env.DB, buildPostSubmission());
    vi.setSystemTime(new Date(LATER));

    const edited = await updatePost(env.DB, original.id, buildPostSubmission({ bodyMarkdown: 'Changed.' }));

    expect(edited).toMatchObject({ bodyMarkdown: 'Changed.', createdAt: FIXED_NOW, updatedAt: LATER });
  });

  it('treats a description change from text to null as an edit', async () => {
    const original = await insertPost(env.DB, buildPostSubmission());
    vi.setSystemTime(new Date(LATER));

    const edited = await updatePost(env.DB, original.id, buildPostSubmission({ description: null }));

    expect(edited).toMatchObject({ description: null, updatedAt: LATER });
  });

  it('does not count a visibility-only change as an edit', async () => {
    const original = await insertPost(env.DB, buildPostSubmission({ venue: null, isPublic: true }));
    vi.setSystemTime(new Date(LATER));

    const hidden = await updatePost(env.DB, original.id, buildPostSubmission({ venue: null, isPublic: false }));

    expect(hidden).toStrictEqual({ ...original, isPublic: false });
  });

  it('refuses to move a post onto a path another post uses', async () => {
    await insertPost(env.DB, buildPostSubmission({ path: 'testing/taken' }));
    const other = await insertPost(env.DB, buildPostSubmission({ path: 'testing/other' }));

    await expect(updatePost(env.DB, other.id, buildPostSubmission({ path: 'testing/taken' }))).rejects.toThrow(
      'Another post already uses the path testing/taken.',
    );
  });

  it('returns null when updating a missing post', async () => {
    await expect(updatePost(env.DB, 'missing', buildPostSubmission())).resolves.toBeNull();
  });

  it('deletes a post once', async () => {
    const post = await insertPost(env.DB, buildPostSubmission());

    await expect(deletePost(env.DB, post.id)).resolves.toBe(true);
    await expect(deletePost(env.DB, post.id)).resolves.toBe(false);
    await expect(findPostById(env.DB, post.id)).resolves.toBeNull();
  });

  it('hides private posts from the public audience', async () => {
    const shown = await insertPost(env.DB, buildPostSubmission({ path: 'testing/shown', isPublic: true }));
    const hidden = await insertPost(env.DB, buildPostSubmission({ path: 'testing/hidden', isPublic: false }));
    const publicIds = (await listPostSummaries(env.DB, PUBLIC_ONLY)).map((post) => post.id);
    const allIds = (await listPostSummaries(env.DB, EVERYONE)).map((post) => post.id);

    expect(publicIds).toContain(shown.id);
    expect(publicIds).not.toContain(hidden.id);
    expect(allIds).toContain(hidden.id);
    await expect(findPostByPath(env.DB, 'testing/hidden', PUBLIC_ONLY)).resolves.toBeNull();
    await expect(findPostByPath(env.DB, 'testing/hidden', EVERYONE)).resolves.toStrictEqual(hidden);
    await expect(isPublicPostPath(env.DB, 'testing/shown')).resolves.toBe(true);
    await expect(isPublicPostPath(env.DB, 'testing/hidden')).resolves.toBe(false);
  });

  it('lists summaries newest first without bodies, and full posts with bodies', async () => {
    await insertPost(env.DB, buildPostSubmission({ path: 'testing/older' }));
    vi.setSystemTime(new Date(LATER));
    const newer = await insertPost(env.DB, buildPostSubmission({ path: 'testing/newer' }));
    const [firstSummary] = await listPostSummaries(env.DB, EVERYONE);
    const [firstFullPost] = await listPostsWithBodies(env.DB);

    expect(firstSummary).toStrictEqual({
      id: newer.id,
      path: newer.path,
      title: newer.title,
      description: newer.description,
      venue: newer.venue,
      tags: newer.tags,
      createdAt: newer.createdAt,
      timestampPrecision: newer.timestampPrecision,
      updatedAt: newer.updatedAt,
      isPublic: newer.isPublic,
    });
    expect(firstFullPost).toStrictEqual(newer);
  });
});
