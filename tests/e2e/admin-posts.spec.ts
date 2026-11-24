import { expect, test } from '@playwright/test';
import { collectPageErrors, isolateFromThirdParties, signInAsAdmin } from './support/browser-guards.ts';

const NEW_POST_PATH = 'testing/e2e-editor-post';
const NEW_POST_URL = `/blog/${NEW_POST_PATH}/`;

test.beforeEach(async ({ context }) => {
  await isolateFromThirdParties(context);
  await signInAsAdmin(context);
});

test('the admin lists every post with links into the editor', async ({ page }) => {
  await page.goto('/admin/');

  await expect(page.getByText(/^\d+ posts · \d+ public · \d+ private$/)).toBeVisible();
  await page.getByRole('link', { name: 'β-delayed proton emission from ¹¹Be in effective field theory' }).click();

  await expect(page).toHaveURL(/\/admin\/posts\/[\w-]+\/$/);
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
    'β-delayed proton emission from ¹¹Be in effective field theory',
  );
  await expect(page.locator('.live-markdown-editor .katex').first()).toBeVisible();

  await page.getByRole('button', { name: 'Preview' }).click();

  await expect(page.getByRole('region', { name: 'Preview' }).locator('.katex').first()).toBeVisible();
});

test('the admin writes a private post, publishes it, edits it, and deletes it', async ({ page, request }) => {
  const errors = collectPageErrors(page);
  await page.goto('/admin/posts/new/');
  await page.getByRole('textbox', { name: 'Title' }).fill('E2E editor post');
  await page.getByRole('textbox', { name: 'Path' }).fill(NEW_POST_PATH);
  await page.getByRole('textbox', { name: 'Tags' }).fill('e2e, editor');
  await page
    .getByRole('textbox', { name: 'Markdown' })
    .fill('## Section\n\nInline math $a^2$.\n\n```ts\nconst x = 1;\n```');

  await expect(page.locator('.live-markdown-editor .cm-live-heading-2')).toHaveText('Section');
  await expect(page.locator('.live-markdown-editor .cm-live-math-inline .katex')).toBeVisible();

  await page.getByRole('button', { name: 'Preview' }).click();

  await expect(page.getByRole('region', { name: 'Preview' }).getByRole('heading', { name: 'Section' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).click();

  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/admin\/posts\/[\w-]+\/$/);
  await expect(page.getByText(/^Created /)).toBeVisible();
  expect((await request.get(NEW_POST_URL)).status()).toBe(404);

  await page.getByText('Post settings').click();
  await page.getByRole('combobox', { name: 'Visibility' }).selectOption('Public');
  await page.keyboard.press('ControlOrMeta+s');

  await expect(page.getByText(/^Created [^·]+$/)).toBeVisible();
  expect((await request.get(NEW_POST_URL)).status()).toBe(200);

  await page.getByRole('textbox', { name: 'Title' }).fill('E2E editor post, revised');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText(/^Created .+ · Edited .+$/)).toBeVisible();

  const editorUrl = page.url();
  await page.goto(NEW_POST_URL);

  await expect(page.locator('.post-title')).toHaveText('E2E editor post, revised');
  await expect(page.locator('.post-article .shiki')).toBeVisible();
  await expect(page.locator('.post-edited')).toContainText('Edited');

  await page.goto(editorUrl);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Click again to delete' }).click();

  await expect(page).toHaveURL('/admin/');
  expect((await request.get(NEW_POST_URL)).status()).toBe(404);
  expect(errors).toStrictEqual([]);
});
