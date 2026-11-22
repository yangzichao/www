import { expect, test } from '@playwright/test';
import { collectPageErrors, isolateFromThirdParties } from './support/browser-guards.ts';

test.beforeEach(async ({ context }) => {
  await isolateFromThirdParties(context);
});

test('homepage renders the profile without errors', async ({ page }) => {
  const errors = collectPageErrors(page);
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/\S/);
  expect(errors).toStrictEqual([]);
});

test('blog index links to posts that render with breadcrumbs and a view count', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto('/blog/');
  const firstPostLink = page.locator('a.post-row-link').first();
  const postPath = await firstPostLink.getAttribute('href');
  await firstPostLink.click();

  await expect(page).toHaveURL(postPath ?? '');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  await expect(page.locator('.post-title')).toBeVisible();
  await expect(page.locator('[data-page-view-count]')).toHaveText(/\d+ views?/);
  expect(errors).toStrictEqual([]);
});

test('view counts go up on each visit', async ({ page }) => {
  const viewCount = page.locator('[data-page-view-count-value]');
  await page.goto('/blog/physics/11be-proton-emission/');
  await expect(viewCount).toHaveText(/^\d+ views?$/);
  const firstCount = Number.parseInt((await viewCount.textContent()) ?? '', 10);
  await page.reload();

  await expect(viewCount).toHaveText(`${firstCount + 1} views`);
});

test('unknown paths return 404', async ({ request }) => {
  const response = await request.get('/definitely/not/a/page/');

  expect(response.status()).toBe(404);
});

test('legacy research URL permanently redirects to the blog post', async ({ request }) => {
  const response = await request.get('/research/11be-proton-emission/', { maxRedirects: 0 });

  expect(response.status()).toBe(301);
  expect(response.headers().location).toBe('/blog/physics/11be-proton-emission/');
});

test('page view API refuses cross-site requests', async ({ request }) => {
  const response = await request.post('/api/page-views', {
    data: '/blog/physics/11be-proton-emission/',
    headers: { origin: 'https://evil.example' },
  });

  expect(response.status()).toBe(403);
});
