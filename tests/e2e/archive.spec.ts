import { expect, test } from '@playwright/test';
import { collectPageErrors, isolateFromThirdParties, signInAsAdmin } from './support/browser-guards.ts';
import { ADMIN_SESSION, VISITOR_SESSION } from './support/e2e-fixtures.ts';

const ARCHIVED_POST = '/archive/blog/system-design/llm-inference/';

test.beforeEach(async ({ context }) => {
  await isolateFromThirdParties(context);
});

test('archived posts are gone from the public blog', async ({ page, request }) => {
  const formerUrl = await request.get('/blog/system-design/llm-inference/', { maxRedirects: 0 });
  await page.goto('/blog/');

  expect(formerUrl.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'System Design' })).toHaveCount(0);
});

test('signed-out readers are sent to admin sign-in from the archive', async ({ request }) => {
  const response = await request.get(ARCHIVED_POST, { maxRedirects: 0 });

  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe(
    `/auth/github/login?intent=admin&return_to=${encodeURIComponent(ARCHIVED_POST)}`,
  );
});

test('visitors cannot open the archive index', async ({ request }) => {
  const response = await request.get('/archive/blog/', {
    maxRedirects: 0,
    headers: { cookie: `session=${VISITOR_SESSION.token}` },
  });

  expect(response.status()).toBe(302);
});

test('the admin sees the archive index without caching or indexing', async ({ request }) => {
  const response = await request.get('/archive/blog/', { headers: { cookie: `session=${ADMIN_SESSION.token}` } });

  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(await response.text()).toContain(`href="${ARCHIVED_POST}"`);
});

test('unknown archive paths are 404 for the admin', async ({ request }) => {
  const response = await request.get('/archive/blog/system-design/not-a-post/', {
    headers: { cookie: `session=${ADMIN_SESSION.token}` },
  });

  expect(response.status()).toBe(404);
});

test('archived diagrams arrive as prerendered whiteboard SVG without loading a renderer', async ({ context, page }) => {
  await signInAsAdmin(context);
  const errors = collectPageErrors(page);
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.goto(ARCHIVED_POST);

  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Archive' }),
  ).toBeVisible();
  const diagram = page.locator('figure.whiteboard-diagram svg[role="img"]').first();
  await expect(diagram).toBeVisible();
  await expect(diagram.locator('title')).toHaveText(/^Diagram: /);
  await expect(page.locator('figure.whiteboard-diagram .wb-node').first()).toBeAttached();
  expect(requestedUrls.filter((url) => url.includes('mermaid') || url.includes('/api/page-views'))).toStrictEqual([]);
  expect(errors).toStrictEqual([]);
});
