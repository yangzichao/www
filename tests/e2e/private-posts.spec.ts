import { expect, test } from '@playwright/test';
import { collectPageErrors, isolateFromThirdParties, signInAsAdmin } from './support/browser-guards.ts';
import { ADMIN_SESSION, VISITOR_SESSION } from './support/e2e-fixtures.ts';

const PRIVATE_POST = '/blog/system-design/llm-inference/';

test.beforeEach(async ({ context }) => {
  await isolateFromThirdParties(context);
});

test('private posts are hidden from readers and visitors', async ({ page, request }) => {
  const anonymous = await request.get(PRIVATE_POST, { maxRedirects: 0 });
  const visitor = await request.get(PRIVATE_POST, { headers: { cookie: `session=${VISITOR_SESSION.token}` } });
  await page.goto('/blog/');

  expect(anonymous.status()).toBe(404);
  expect(anonymous.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(visitor.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'System Design' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Private', exact: true })).toHaveCount(0);
});

test('readers cannot reveal private posts through the visibility filter', async ({ page }) => {
  await page.goto('/blog/?visibility=private');

  await expect(page.locator('a.post-row-link').first()).toBeVisible();
  await expect(page.locator('.post-row-private')).toHaveCount(0);
});

test('old archive URLs redirect into the blog', async ({ request }) => {
  const index = await request.get('/archive/blog/', { maxRedirects: 0 });
  const post = await request.get('/archive/blog/system-design/llm-inference/', { maxRedirects: 0 });

  expect(index.status()).toBe(301);
  expect(index.headers().location).toBe('/blog/?visibility=private');
  expect(post.status()).toBe(301);
  expect(post.headers().location).toBe(PRIVATE_POST);
});

test('the admin sees private posts without caching or indexing', async ({ request }) => {
  const response = await request.get(PRIVATE_POST, { headers: { cookie: `session=${ADMIN_SESSION.token}` } });

  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
});

test('the admin filters the blog down to private posts', async ({ context, page }) => {
  await signInAsAdmin(context);
  await page.goto('/blog/');
  await page.getByRole('navigation', { name: 'Sort and filter' }).getByRole('link', { name: 'Private' }).click();

  await expect(page).toHaveURL('/blog/?visibility=private');
  await expect(page.getByRole('heading', { name: 'System Design' })).toBeVisible();
  await expect(page.locator(`a.post-row-link[href="/blog/physics/11be-proton-emission/"]`)).toHaveCount(0);
});

test('private diagrams arrive as stored whiteboard SVG without loading a renderer', async ({ context, page }) => {
  await signInAsAdmin(context);
  const errors = collectPageErrors(page);
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.goto(PRIVATE_POST);

  await expect(page.locator('.post-private-badge')).toBeVisible();
  const diagram = page.locator('figure.whiteboard-diagram svg[role="img"]').first();
  await expect(diagram).toBeVisible();
  await expect(diagram.locator('title')).toHaveText(/^Diagram: /);
  await expect(page.locator('figure.whiteboard-diagram .wb-node').first()).toBeAttached();
  expect(requestedUrls.filter((url) => url.includes('mermaid') || url.includes('/api/page-views'))).toStrictEqual([]);
  expect(errors).toStrictEqual([]);
});
