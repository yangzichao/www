import { expect, test } from '@playwright/test';
import {
  collectPageErrors,
  isolateFromThirdParties,
  signInAsAdmin,
  signInAsVisitor,
} from './support/browser-guards.ts';
import { ADMIN_SESSION } from './support/e2e-fixtures.ts';
import { waitUntilIslandHydrated } from './support/island-hydration.ts';

test.beforeEach(async ({ context }) => {
  await isolateFromThirdParties(context);
});

test('the homepage links to thoughts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Thoughts' }).click();

  await expect(page).toHaveURL('/thoughts/');
  await expect(page.getByRole('heading', { level: 1, name: 'Thoughts' })).toBeVisible();
});

test('readers see the imported thoughts without any admin controls', async ({ page, context }) => {
  const errors = collectPageErrors(page);
  await signInAsVisitor(context);
  await page.goto('/thoughts/');

  await expect(page.locator('[data-thought-id="legacy-2026-02-01"]')).toContainText('Epistemic humility');
  await expect(page.locator('[data-thought-id="legacy-2026-02-01"] time')).toHaveText('Feb 2026');
  await expect(page.getByRole('textbox', { name: 'New thought' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Markdown' })).toHaveCount(0);
  expect(errors).toStrictEqual([]);
});

test('the admin posts a thought, sees it first, exports it, and deletes it', async ({ page, context }) => {
  const errors = collectPageErrors(page);
  await signInAsAdmin(context);
  await page.goto('/thoughts/');
  const thoughtText = 'E2E thought posted from the composer';

  const thoughtBox = page.getByRole('textbox', { name: 'New thought' });
  await waitUntilIslandHydrated(thoughtBox);
  await thoughtBox.fill(`${thoughtText} with **markdown**`);
  await page.getByRole('textbox', { name: 'Tags' }).fill('e2e');
  await page.getByRole('button', { name: 'Post' }).click();

  const newestCard = page.locator('.thought-card').first();
  await expect(newestCard).toContainText(thoughtText);
  await expect(newestCard.locator('strong')).toHaveText('markdown');
  await expect(newestCard.locator('.thought-tag')).toHaveText('e2e');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Markdown' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^thoughts-\d{4}-\d{2}-\d{2}\.md$/);

  await waitUntilIslandHydrated(newestCard.getByRole('button', { name: 'Delete' }));
  await newestCard.getByRole('button', { name: 'Delete' }).click();
  await newestCard.getByRole('button', { name: 'Click again to delete' }).click();
  await expect(page.locator('.thought-card').filter({ hasText: thoughtText })).toHaveCount(0);
  expect(errors).toStrictEqual([]);
});

test('the admin edits a thought into a private one that readers cannot see', async ({ page, context, browser }) => {
  const errors = collectPageErrors(page);
  await signInAsAdmin(context);
  await page.goto('/thoughts/');
  const originalText = 'E2E thought before editing';
  const editedText = 'E2E thought after editing';

  const thoughtBox = page.getByRole('textbox', { name: 'New thought' });
  await waitUntilIslandHydrated(thoughtBox);
  await thoughtBox.fill(originalText);
  await page.getByRole('textbox', { name: 'Tags' }).fill('e2e-edit');
  await page.getByRole('button', { name: 'Post' }).click();

  const card = page.locator('.thought-card').filter({ hasText: originalText });
  await expect(card.locator('.thought-edited')).toHaveCount(0);
  await waitUntilIslandHydrated(card.getByRole('button', { name: 'Edit' }));
  await card.getByRole('button', { name: 'Edit' }).click();
  const editBox = card.getByRole('textbox', { name: 'Edit thought' });
  await editBox.fill(editedText);
  await card.getByRole('combobox', { name: 'Visibility' }).selectOption('private');
  await card.getByRole('button', { name: 'Save' }).click();

  const editedCard = page.locator('.thought-card').filter({ hasText: editedText });
  await expect(editedCard).toHaveAttribute('data-visibility', 'private');
  await expect(editedCard.locator('.thought-edited')).toContainText('Edited');
  await expect(editedCard).toContainText('Private');

  await page.getByRole('link', { name: 'Private', exact: true }).click();
  await expect(page).toHaveURL('/thoughts/?visibility=private');
  await expect(page.locator('.thought-card')).toHaveCount(1);

  const readerContext = await browser.newContext();
  await isolateFromThirdParties(readerContext);
  const readerPage = await readerContext.newPage();
  await readerPage.goto('/thoughts/');
  await expect(readerPage.locator('.thought-card').filter({ hasText: editedText })).toHaveCount(0);
  await readerPage.goto('/thoughts/?visibility=private');
  await expect(readerPage.locator('.thought-card').filter({ hasText: editedText })).toHaveCount(0);
  await readerContext.close();

  await waitUntilIslandHydrated(editedCard.getByRole('button', { name: 'Delete' }));
  await editedCard.getByRole('button', { name: 'Delete' }).click();
  await editedCard.getByRole('button', { name: 'Click again to delete' }).click();
  await expect(page.locator('.thought-card').filter({ hasText: editedText })).toHaveCount(0);
  expect(errors).toStrictEqual([]);
});

test('readers sort oldest first and filter by tag', async ({ page }) => {
  await page.goto('/thoughts/');

  await page.getByRole('link', { name: 'Oldest' }).click();
  await expect(page).toHaveURL('/thoughts/?sort=oldest');
  await expect(page.locator('.thought-card').first()).toHaveAttribute('data-thought-id', 'legacy-2026-02-01');

  await page.locator('.thought-card').first().getByRole('link', { name: 'ai' }).click();
  await expect(page).toHaveURL('/thoughts/?sort=oldest&tag=ai');
  await expect(page.locator('.thought-card')).toHaveCount(4);
  await expect(page.locator('.thoughts-count')).toHaveText(/^4 of \d+ thoughts$/);

  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL('/thoughts/?sort=oldest');
});

test('thought writes refuse cross-site requests even with an admin cookie', async ({ request }) => {
  const response = await request.post('/api/thoughts', {
    data: { body: 'Forged.', isPublic: true },
    headers: { origin: 'https://evil.example', cookie: `session=${ADMIN_SESSION.token}` },
  });

  expect(response.status()).toBe(403);
});
