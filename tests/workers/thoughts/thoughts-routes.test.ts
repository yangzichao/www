import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { insertThought, listThoughtsNewestFirst } from '../../../src/features/thoughts/thought-store';
import type { ThoughtResponse } from '../../../src/features/thoughts/thought-types';
import { DELETE as deleteRoute, PATCH as patchRoute } from '../../../src/pages/api/thoughts/[id]/index';
import { GET as exportRoute } from '../../../src/pages/api/thoughts/export';
import { POST as postRoute } from '../../../src/pages/api/thoughts/index';
import { callRoute } from '../support/api-context';
import { resetDatabase, signInAdminWithoutRepositoryAccess, signInVisitor } from '../support/database';

const FIXED_NOW = '2026-11-22T21:30:00.000Z';
const LATER = '2026-11-23T08:00:00.000Z';
const ADMIN_AUDIENCE = { includePrivate: true };

async function cookiesFor(viewer: 'nobody' | 'a visitor' | 'the admin'): Promise<Record<string, string>> {
  if (viewer === 'a visitor') return signInVisitor();
  if (viewer === 'the admin') return signInAdminWithoutRepositoryAccess();
  return {};
}

describe('thoughts API', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(FIXED_NOW));
    await resetDatabase();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('POST /api/thoughts', () => {
    it('publishes a thought for the admin', async () => {
      const { response } = await callRoute(postRoute, {
        method: 'POST',
        path: '/api/thoughts',
        body: { body: ' Ship small. ', tags: ['#work'], isPublic: false },
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(201);
      expect(response.headers.get('cache-control')).toBe('no-store');

      const { thought } = await response.json<ThoughtResponse>();

      expect(thought).toMatchObject({ body: 'Ship small.', tags: ['work'], createdAt: FIXED_NOW, isPublic: false });
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toStrictEqual([thought]);
    });

    it('rejects an empty thought', async () => {
      const { response } = await callRoute(postRoute, {
        method: 'POST',
        path: '/api/thoughts',
        body: 'not json',
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toStrictEqual({ error: 'Request body must be a JSON object.' });
    });

    it.each([
      { viewer: 'nobody', expectedStatus: 401 },
      { viewer: 'a visitor', expectedStatus: 403 },
    ] as const)('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
      const { response } = await callRoute(postRoute, {
        method: 'POST',
        path: '/api/thoughts',
        body: { body: 'Sneaky.', isPublic: true },
        cookies: await cookiesFor(viewer),
      });

      expect(response.status).toBe(expectedStatus);
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toStrictEqual([]);
    });

    it('rejects cross-origin posts even from the admin', async () => {
      const { response } = await callRoute(postRoute, {
        method: 'POST',
        path: '/api/thoughts',
        body: { body: 'Forged.', isPublic: true },
        sameOrigin: false,
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(403);
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toStrictEqual([]);
    });
  });

  describe('PATCH /api/thoughts/:id', () => {
    async function patchAs(viewer: 'nobody' | 'a visitor' | 'the admin', thoughtId: string, body: object) {
      return callRoute(patchRoute, {
        method: 'PATCH',
        path: `/api/thoughts/${thoughtId}`,
        params: { id: thoughtId },
        body,
        cookies: await cookiesFor(viewer),
      });
    }

    it('edits the body, tags, and visibility for the admin and stamps the edit time', async () => {
      const original = await insertThought(env.DB, { body: 'First take.', tags: ['ai'], isPublic: true });
      vi.setSystemTime(new Date(LATER));

      const { response } = await patchAs('the admin', original.id, {
        body: ' Second take. ',
        tags: ['#life'],
        isPublic: false,
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');

      const { thought } = await response.json<ThoughtResponse>();

      expect(thought).toStrictEqual({
        ...original,
        body: 'Second take.',
        tags: ['life'],
        isPublic: false,
        updatedAt: LATER,
      });
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toStrictEqual([thought]);
    });

    it('rejects an edit without an explicit visibility', async () => {
      const original = await insertThought(env.DB, { body: 'Keep me.', tags: [], isPublic: false });

      const { response } = await patchAs('the admin', original.id, { body: 'Changed.' });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toStrictEqual({ error: 'isPublic must be true or false.' });
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toStrictEqual([original]);
    });

    it('404s for a thought that does not exist', async () => {
      const { response } = await patchAs('the admin', 'missing', { body: 'Ghost.', isPublic: true });

      expect(response.status).toBe(404);
    });

    it('treats a missing id as not found', async () => {
      const { response } = await callRoute(patchRoute, {
        method: 'PATCH',
        path: '/api/thoughts/',
        body: { body: 'Ghost.', isPublic: true },
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(404);
    });

    it.each([
      { viewer: 'nobody', expectedStatus: 401 },
      { viewer: 'a visitor', expectedStatus: 403 },
    ] as const)('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
      const original = await insertThought(env.DB, { body: 'Keep me.', tags: [], isPublic: true });

      const { response } = await patchAs(viewer, original.id, { body: 'Hijacked.', isPublic: true });

      expect(response.status).toBe(expectedStatus);
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toStrictEqual([original]);
    });

    it('rejects cross-origin edits even from the admin', async () => {
      const original = await insertThought(env.DB, { body: 'Keep me.', tags: [], isPublic: true });
      const { response } = await callRoute(patchRoute, {
        method: 'PATCH',
        path: `/api/thoughts/${original.id}`,
        params: { id: original.id },
        body: { body: 'Forged.', isPublic: true },
        sameOrigin: false,
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(403);
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toStrictEqual([original]);
    });
  });

  describe('DELETE /api/thoughts/:id', () => {
    it('deletes a thought for the admin and 404s when it is gone', async () => {
      const thought = await insertThought(env.DB, { body: 'Temporary.', tags: [], isPublic: true });
      const request = { method: 'DELETE', path: `/api/thoughts/${thought.id}`, params: { id: thought.id } };

      const first = await callRoute(deleteRoute, { ...request, cookies: await cookiesFor('the admin') });
      const second = await callRoute(deleteRoute, { ...request, cookies: await cookiesFor('the admin') });

      expect(first.response.status).toBe(200);
      expect(second.response.status).toBe(404);
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toStrictEqual([]);
    });

    it('treats a missing id as not found', async () => {
      const { response } = await callRoute(deleteRoute, {
        method: 'DELETE',
        path: '/api/thoughts/',
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(404);
    });

    it.each([
      { viewer: 'nobody', expectedStatus: 401 },
      { viewer: 'a visitor', expectedStatus: 403 },
    ] as const)('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
      const thought = await insertThought(env.DB, { body: 'Keep me.', tags: [], isPublic: true });
      const { response } = await callRoute(deleteRoute, {
        method: 'DELETE',
        path: `/api/thoughts/${thought.id}`,
        params: { id: thought.id },
        cookies: await cookiesFor(viewer),
      });

      expect(response.status).toBe(expectedStatus);
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toHaveLength(1);
    });

    it('rejects cross-origin deletes even from the admin', async () => {
      const thought = await insertThought(env.DB, { body: 'Keep me.', tags: [], isPublic: true });
      const { response } = await callRoute(deleteRoute, {
        method: 'DELETE',
        path: `/api/thoughts/${thought.id}`,
        params: { id: thought.id },
        sameOrigin: false,
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(403);
      await expect(listThoughtsNewestFirst(env.DB, ADMIN_AUDIENCE)).resolves.toHaveLength(1);
    });
  });

  describe('GET /api/thoughts/export', () => {
    it('downloads every thought as markdown by default', async () => {
      await insertThought(env.DB, { body: 'Exported idea.', tags: ['ai'], isPublic: true });
      const { response } = await callRoute(exportRoute, {
        path: '/api/thoughts/export',
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
      expect(response.headers.get('content-disposition')).toBe('attachment; filename="thoughts-2026-11-22.md"');
      expect(response.headers.get('cache-control')).toBe('no-store');
      await expect(response.text()).resolves.toContain('Tags: ai\n\nExported idea.\n');
    });

    it('includes private thoughts in the export', async () => {
      await insertThought(env.DB, { body: 'Only for me.', tags: [], isPublic: false });
      const { response } = await callRoute(exportRoute, {
        path: '/api/thoughts/export',
        cookies: await cookiesFor('the admin'),
      });

      await expect(response.text()).resolves.toContain('Visibility: private\n\nOnly for me.\n');
    });

    it('downloads JSON on request', async () => {
      const thought = await insertThought(env.DB, { body: 'Exported idea.', tags: [], isPublic: true });
      const { response } = await callRoute(exportRoute, {
        path: '/api/thoughts/export?format=json',
        cookies: await cookiesFor('the admin'),
      });

      expect(response.headers.get('content-disposition')).toBe('attachment; filename="thoughts-2026-11-22.json"');
      await expect(response.json()).resolves.toStrictEqual({ exportedAt: FIXED_NOW, thoughts: [thought] });
    });

    it('rejects an unknown format', async () => {
      const { response } = await callRoute(exportRoute, {
        path: '/api/thoughts/export?format=csv',
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(400);
    });

    it.each([
      { viewer: 'nobody', expectedStatus: 401 },
      { viewer: 'a visitor', expectedStatus: 403 },
    ] as const)('refuses $viewer with $expectedStatus', async ({ viewer, expectedStatus }) => {
      const { response } = await callRoute(exportRoute, {
        path: '/api/thoughts/export',
        cookies: await cookiesFor(viewer),
      });

      expect(response.status).toBe(expectedStatus);
    });
  });
});
