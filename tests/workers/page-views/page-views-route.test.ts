import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '../../../src/pages/api/page-views';
import { PRIVATE_TEST_POST_PAGE, PUBLISHED_TEST_PAGE, STATIC_TEST_PAGE } from '../../support/published-pages';
import { callRoute } from '../support/api-context';
import { resetDatabase } from '../support/database';

describe('POST /api/page-views', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('records a view of a published page and returns the running total', async () => {
    await callRoute(POST, { method: 'POST', path: '/api/page-views', body: PUBLISHED_TEST_PAGE });
    const { response } = await callRoute(POST, { method: 'POST', path: '/api/page-views', body: PUBLISHED_TEST_PAGE });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toStrictEqual({ path: PUBLISHED_TEST_PAGE, totalViews: 2 });
  });

  it('rejects cross-origin requests', async () => {
    const { response } = await callRoute(POST, {
      method: 'POST',
      path: '/api/page-views',
      body: PUBLISHED_TEST_PAGE,
      sameOrigin: false,
    });

    expect(response.status).toBe(403);
  });

  it('counts views on static pages served from the assets', async () => {
    const { response } = await callRoute(POST, { method: 'POST', path: '/api/page-views', body: STATIC_TEST_PAGE });

    await expect(response.json()).resolves.toStrictEqual({ path: STATIC_TEST_PAGE, totalViews: 1 });
  });

  it.each([
    '/blog/not-a-real-post/',
    '/blog/physics/missing-post/',
    PRIVATE_TEST_POST_PAGE,
    'not-a-path',
    '/blog/../etc/passwd',
    '',
  ])('rejects %j because it is not a published page', async (path) => {
    const { response } = await callRoute(POST, { method: 'POST', path: '/api/page-views', body: path });

    expect(response.status).toBe(400);
  });
});
