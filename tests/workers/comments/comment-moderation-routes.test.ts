import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { insertComment, listCommentsForPage } from '../../../src/features/comments/comment-store';
import type { PublicComment } from '../../../src/features/comments/comment-types';
import { GET as listModerationQueue } from '../../../src/pages/api/admin/comments';
import { POST as approve } from '../../../src/pages/api/comments/[id]/approve';
import { DELETE as remove } from '../../../src/pages/api/comments/[id]/index';
import { PUBLISHED_TEST_PAGE } from '../../support/published-pages';
import { callRoute } from '../support/api-context';
import { resetDatabase, signInAdminWithoutRepositoryAccess, signInVisitor } from '../support/database';

async function seedComment(status: PublicComment['status']) {
  return insertComment(env.DB, {
    pagePath: PUBLISHED_TEST_PAGE,
    body: `A ${status} comment`,
    authorKind: 'anonymous',
    authorName: 'Anonymous',
    githubLogin: null,
    githubAvatarUrl: null,
    status,
  });
}

describe('POST /api/comments/:id/approve', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('publishes a pending comment for the admin', async () => {
    const pending = await seedComment('pending');
    const { response } = await callRoute(approve, {
      method: 'POST',
      path: `/api/comments/${pending.id}/approve`,
      params: { id: pending.id },
      cookies: await signInAdminWithoutRepositoryAccess(),
    });

    expect(response.status).toBe(200);
    await expect(listCommentsForPage(env.DB, PUBLISHED_TEST_PAGE, { includePending: false })).resolves.toHaveLength(1);
  });

  it('returns 404 for a comment that is not pending', async () => {
    const published = await seedComment('published');
    const { response } = await callRoute(approve, {
      method: 'POST',
      path: `/api/comments/${published.id}/approve`,
      params: { id: published.id },
      cookies: await signInAdminWithoutRepositoryAccess(),
    });

    expect(response.status).toBe(404);
  });

  it.each([
    { viewer: 'nobody', expectedStatus: 401 },
    { viewer: 'a visitor', expectedStatus: 403 },
  ])('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
    const pending = await seedComment('pending');
    const { response } = await callRoute(approve, {
      method: 'POST',
      path: `/api/comments/${pending.id}/approve`,
      params: { id: pending.id },
      ...(viewer === 'a visitor' ? { cookies: await signInVisitor() } : {}),
    });

    expect(response.status).toBe(expectedStatus);
    await expect(listCommentsForPage(env.DB, PUBLISHED_TEST_PAGE, { includePending: false })).resolves.toHaveLength(0);
  });

  it('rejects cross-origin approval even from the admin', async () => {
    const pending = await seedComment('pending');
    const { response } = await callRoute(approve, {
      method: 'POST',
      path: `/api/comments/${pending.id}/approve`,
      params: { id: pending.id },
      sameOrigin: false,
      cookies: await signInAdminWithoutRepositoryAccess(),
    });

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/comments/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('deletes any comment for the admin', async () => {
    const published = await seedComment('published');
    const { response } = await callRoute(remove, {
      method: 'DELETE',
      path: `/api/comments/${published.id}`,
      params: { id: published.id },
      cookies: await signInAdminWithoutRepositoryAccess(),
    });

    expect(response.status).toBe(200);
    await expect(listCommentsForPage(env.DB, PUBLISHED_TEST_PAGE, { includePending: true })).resolves.toHaveLength(0);
  });

  it('returns 404 for an unknown comment', async () => {
    const { response } = await callRoute(remove, {
      method: 'DELETE',
      path: '/api/comments/missing',
      params: { id: 'missing' },
      cookies: await signInAdminWithoutRepositoryAccess(),
    });

    expect(response.status).toBe(404);
  });

  it('refuses a visitor', async () => {
    const published = await seedComment('published');
    const { response } = await callRoute(remove, {
      method: 'DELETE',
      path: `/api/comments/${published.id}`,
      params: { id: published.id },
      cookies: await signInVisitor(),
    });

    expect(response.status).toBe(403);
  });

  it('rejects cross-origin deletes', async () => {
    const published = await seedComment('published');
    const { response } = await callRoute(remove, {
      method: 'DELETE',
      path: `/api/comments/${published.id}`,
      params: { id: published.id },
      sameOrigin: false,
      cookies: await signInAdminWithoutRepositoryAccess(),
    });

    expect(response.status).toBe(403);
  });
});

describe('GET /api/admin/comments', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns pending and recently published comments to the admin', async () => {
    await seedComment('pending');
    await seedComment('published');
    const { response } = await callRoute(listModerationQueue, {
      path: '/api/admin/comments',
      cookies: await signInAdminWithoutRepositoryAccess(),
    });
    const queue = await response.json<{ pending: PublicComment[]; recent: PublicComment[] }>();

    expect(queue.pending.map((comment) => comment.status)).toStrictEqual(['pending']);
    expect(queue.recent.map((comment) => comment.status)).toStrictEqual(['published']);
  });

  it('refuses anyone else', async () => {
    const { response } = await callRoute(listModerationQueue, { path: '/api/admin/comments' });

    expect(response.status).toBe(401);
  });
});
