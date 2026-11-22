import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { insertThought, listThoughtsNewestFirst } from '../../../src/features/thoughts/thought-store';
import type { CreateThoughtResponse } from '../../../src/features/thoughts/thought-types';
import { DELETE as deleteRoute } from '../../../src/pages/api/thoughts/[id]/index';
import { GET as exportRoute } from '../../../src/pages/api/thoughts/export';
import { POST as postRoute } from '../../../src/pages/api/thoughts/index';
import { callRoute } from '../support/api-context';
import { resetDatabase, signInAdminWithoutRepositoryAccess, signInVisitor } from '../support/database';

const FIXED_NOW = '2026-11-22T21:30:00.000Z';

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
        body: { body: ' Ship small. ', tags: ['#work'] },
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(201);
      expect(response.headers.get('cache-control')).toBe('no-store');

      const { thought } = await response.json<CreateThoughtResponse>();

      expect(thought).toMatchObject({ body: 'Ship small.', tags: ['work'], createdAt: FIXED_NOW });
      await expect(listThoughtsNewestFirst(env.DB)).resolves.toStrictEqual([thought]);
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
        body: { body: 'Sneaky.' },
        cookies: await cookiesFor(viewer),
      });

      expect(response.status).toBe(expectedStatus);
      await expect(listThoughtsNewestFirst(env.DB)).resolves.toStrictEqual([]);
    });

    it('rejects cross-origin posts even from the admin', async () => {
      const { response } = await callRoute(postRoute, {
        method: 'POST',
        path: '/api/thoughts',
        body: { body: 'Forged.' },
        sameOrigin: false,
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(403);
      await expect(listThoughtsNewestFirst(env.DB)).resolves.toStrictEqual([]);
    });
  });

  describe('DELETE /api/thoughts/:id', () => {
    it('deletes a thought for the admin and 404s when it is gone', async () => {
      const thought = await insertThought(env.DB, { body: 'Temporary.', tags: [] });
      const request = { method: 'DELETE', path: `/api/thoughts/${thought.id}`, params: { id: thought.id } };

      const first = await callRoute(deleteRoute, { ...request, cookies: await cookiesFor('the admin') });
      const second = await callRoute(deleteRoute, { ...request, cookies: await cookiesFor('the admin') });

      expect(first.response.status).toBe(200);
      expect(second.response.status).toBe(404);
      await expect(listThoughtsNewestFirst(env.DB)).resolves.toStrictEqual([]);
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
      const thought = await insertThought(env.DB, { body: 'Keep me.', tags: [] });
      const { response } = await callRoute(deleteRoute, {
        method: 'DELETE',
        path: `/api/thoughts/${thought.id}`,
        params: { id: thought.id },
        cookies: await cookiesFor(viewer),
      });

      expect(response.status).toBe(expectedStatus);
      await expect(listThoughtsNewestFirst(env.DB)).resolves.toHaveLength(1);
    });

    it('rejects cross-origin deletes even from the admin', async () => {
      const thought = await insertThought(env.DB, { body: 'Keep me.', tags: [] });
      const { response } = await callRoute(deleteRoute, {
        method: 'DELETE',
        path: `/api/thoughts/${thought.id}`,
        params: { id: thought.id },
        sameOrigin: false,
        cookies: await cookiesFor('the admin'),
      });

      expect(response.status).toBe(403);
      await expect(listThoughtsNewestFirst(env.DB)).resolves.toHaveLength(1);
    });
  });

  describe('GET /api/thoughts/export', () => {
    it('downloads every thought as markdown by default', async () => {
      await insertThought(env.DB, { body: 'Exported idea.', tags: ['ai'] });
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

    it('downloads JSON on request', async () => {
      const thought = await insertThought(env.DB, { body: 'Exported idea.', tags: [] });
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
