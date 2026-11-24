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

test('the homepage links to the blog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Blog' }).click();

  await expect(page).toHaveURL('/blog/');
  await expect(page.getByRole('heading', { level: 1, name: 'Writing' })).toBeVisible();
});

test('blog index links to posts that render with breadcrumbs and a view count', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto('/blog/');
  const firstPostLink = page.locator('a.post-card-link').first();
  const postPath = await firstPostLink.getAttribute('href');
  await firstPostLink.click();

  await expect(page).toHaveURL(postPath ?? '');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  await expect(page.locator('.post-title')).toBeVisible();
  await expect(page.locator('[data-page-view-count]')).toHaveText(/\d+ views?/);
  expect(errors).toStrictEqual([]);
});

test('readers sort and filter the blog index', async ({ page }) => {
  await page.goto('/blog/');
  const toolbar = page.getByRole('navigation', { name: 'Sort and filter' });
  await toolbar.getByRole('link', { name: /^halo eft/ }).click();

  await expect(page).toHaveURL('/blog/?tag=halo+eft');
  await expect(page.locator('a.post-card-link')).toHaveCount(1);
  await expect(page.getByText('1 of 5 posts')).toBeVisible();

  await toolbar.getByRole('link', { name: 'Clear filters' }).click();
  await toolbar.getByRole('searchbox', { name: 'Search posts' }).fill('attention');
  await toolbar.getByRole('searchbox', { name: 'Search posts' }).press('Enter');

  await expect(page).toHaveURL('/blog/?q=attention');
  await expect(page.locator('a.post-card-link')).toHaveAttribute('href', '/blog/life/four-traps-of-attention/');

  await toolbar.getByRole('link', { name: 'Clear filters' }).click();
  await toolbar.getByRole('link', { name: /^Physics/ }).click();

  await expect(page).toHaveURL('/blog/?category=physics');
  await expect(page.locator('a.post-card-link')).toHaveAttribute('href', '/blog/physics/11be-proton-emission/');

  await page.goto('/blog/?sort=oldest');

  await expect(page.locator('a.post-card-link').first()).toBeVisible();
});

test('a post breadcrumb leads back to its topic on the index', async ({ page }) => {
  await page.goto('/blog/physics/11be-proton-emission/');
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Physics' }).click();

  await expect(page).toHaveURL('/blog/?category=physics');
  const topicLink = page.getByRole('navigation', { name: 'Sort and filter' }).getByRole('link', { name: /^Physics/ });
  await expect(topicLink).toHaveAttribute('aria-current', 'true');
});

test('pressing slash jumps to the search box', async ({ page }) => {
  await page.goto('/thoughts/');
  await page.keyboard.press('/');

  await expect(page.getByRole('searchbox', { name: 'Search thoughts' })).toBeFocused();
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
