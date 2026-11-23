import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findPostById, insertPost } from '../../../src/features/posts/store/post-store';
import type { PostResponse } from '../../../src/features/posts/post-types';
import { DELETE as deleteRoute, PATCH as patchRoute } from '../../../src/pages/api/posts/[id]/index';
import { GET as exportRoute } from '../../../src/pages/api/posts/export';
import { POST as postRoute } from '../../../src/pages/api/posts/index';
import { buildPostSubmission } from '../../support/post-fixtures';
import { callRoute } from '../support/api-context';
import { deleteTestPosts, resetDatabase, signInAdmin, signInVisitor } from '../support/database';

const FIXED_NOW = '2026-11-22T21:30:00.000Z';
const LATER = '2026-11-23T08:00:00.000Z';

type Viewer = 'nobody' | 'a visitor' | 'the admin';

async function cookiesFor(viewer: Viewer): Promise<Record<string, string>> {
  if (viewer === 'a visitor') return signInVisitor();
  if (viewer === 'the admin') return signInAdmin();
  return {};
}

const REFUSED_VIEWERS = [
  { viewer: 'nobody', expectedStatus: 401 },
  { viewer: 'a visitor', expectedStatus: 403 },
] as const;

describe('posts API', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(FIXED_NOW));
    await resetDatabase();
    await deleteTestPosts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('POST /api/posts', () => {
    async function createAs(viewer: Viewer, body: object | string, sameOrigin = true) {
      return callRoute(postRoute, {
        method: 'POST',
        path: '/api/posts',
        body,
        sameOrigin,
        cookies: await cookiesFor(viewer),
      });
    }

    it('creates a post for the admin', async () => {
      const { response } = await createAs('the admin', { ...buildPostSubmission(), title: ' First post ' });

      expect(response.status).toBe(201);
      expect(response.headers.get('cache-control')).toBe('no-store');

      const { post } = await response.json<PostResponse>();

      expect(post).toMatchObject({ ...buildPostSubmission(), createdAt: FIXED_NOW, updatedAt: null });
      await expect(findPostById(env.DB, post.id)).resolves.toStrictEqual(post);
    });

    it('explains an invalid submission', async () => {
      const { response } = await createAs('the admin', { ...buildPostSubmission(), path: 'Bad Path' });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toStrictEqual({
        error: 'Path must look like category/slug, using lowercase letters, digits, and dashes.',
      });
    });

    it('rejects a body that is not JSON', async () => {
      const { response } = await createAs('the admin', '{not json');

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toStrictEqual({ error: 'Request body must be a JSON object.' });
    });

    it('reports a taken path as a conflict', async () => {
      await insertPost(env.DB, buildPostSubmission());

      const { response } = await createAs('the admin', buildPostSubmission());

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toStrictEqual({
        error: 'Another post already uses the path testing/first-post.',
      });
    });

    it.each(REFUSED_VIEWERS)('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
      const { response } = await createAs(viewer, buildPostSubmission());

      expect(response.status).toBe(expectedStatus);
    });

    it('rejects cross-origin writes even from the admin', async () => {
      const { response } = await createAs('the admin', buildPostSubmission(), false);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/posts/:id', () => {
    async function patchAs(viewer: Viewer, postId: string, body: object) {
      return callRoute(patchRoute, {
        method: 'PATCH',
        path: `/api/posts/${postId}`,
        params: { id: postId },
        body,
        cookies: await cookiesFor(viewer),
      });
    }

    it('saves an edit and stamps the edit time', async () => {
      const original = await insertPost(env.DB, buildPostSubmission());
      vi.setSystemTime(new Date(LATER));

      const { response } = await patchAs(
        'the admin',
        original.id,
        buildPostSubmission({ title: 'Renamed', isPublic: false }),
      );
      const { post } = await response.json<PostResponse>();

      expect(response.status).toBe(200);
      expect(post).toStrictEqual({ ...original, title: 'Renamed', isPublic: false, updatedAt: LATER });
    });

    it('404s for a post that does not exist', async () => {
      const { response } = await patchAs('the admin', 'missing', buildPostSubmission());

      expect(response.status).toBe(404);
    });

    it('404s when the route has no id', async () => {
      const { response } = await callRoute(patchRoute, {
        method: 'PATCH',
        path: '/api/posts/',
        body: buildPostSubmission(),
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(404);
    });

    it.each(REFUSED_VIEWERS)('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
      const original = await insertPost(env.DB, buildPostSubmission());

      const { response } = await patchAs(viewer, original.id, buildPostSubmission({ title: 'Hijacked' }));

      expect(response.status).toBe(expectedStatus);
      await expect(findPostById(env.DB, original.id)).resolves.toStrictEqual(original);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    async function deleteAs(viewer: Viewer, postId: string | null) {
      return callRoute(deleteRoute, {
        method: 'DELETE',
        path: `/api/posts/${postId ?? ''}`,
        ...(postId === null ? {} : { params: { id: postId } }),
        cookies: await cookiesFor(viewer),
      });
    }

    it('deletes a post for the admin', async () => {
      const post = await insertPost(env.DB, buildPostSubmission());

      const { response } = await deleteAs('the admin', post.id);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual({ deleted: true });
      await expect(findPostById(env.DB, post.id)).resolves.toBeNull();
    });

    it.each(['missing', null])('404s for %j', async (postId) => {
      const { response } = await deleteAs('the admin', postId);

      expect(response.status).toBe(404);
    });

    it.each(REFUSED_VIEWERS)('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
      const post = await insertPost(env.DB, buildPostSubmission());

      const { response } = await deleteAs(viewer, post.id);

      expect(response.status).toBe(expectedStatus);
      await expect(findPostById(env.DB, post.id)).resolves.not.toBeNull();
    });
  });

  describe('GET /api/posts/export', () => {
    it('downloads every post, private ones included, for the admin', async () => {
      const hidden = await insertPost(env.DB, buildPostSubmission({ isPublic: false }));

      const { response } = await callRoute(exportRoute, {
        path: '/api/posts/export',
        cookies: await cookiesFor('the admin'),
      });
      const exported = await response.json<{ posts: { id: string; isPublic: boolean }[] }>();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toBe('attachment; filename="posts-2026-11-22.json"');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(exported.posts).toContainEqual(expect.objectContaining({ id: hidden.id, isPublic: false }));
    });

    it.each(REFUSED_VIEWERS)('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
      const { response } = await callRoute(exportRoute, {
        path: '/api/posts/export',
        cookies: await cookiesFor(viewer),
      });

      expect(response.status).toBe(expectedStatus);
    });
  });
});
