import { expect, test } from '@playwright/test';
import {
  collectPageErrors,
  isolateFromThirdParties,
  signInAsAdmin,
  signInAsVisitor,
} from './support/browser-guards.ts';
import { COMMENT_TEST_PAGE, SEEDED_PENDING_COMMENT, VISITOR_SESSION } from './support/e2e-fixtures.ts';

test.beforeEach(async ({ context }) => {
  await isolateFromThirdParties(context);
});

test('anonymous readers do not see pending comments and must pass Turnstile to post', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto(COMMENT_TEST_PAGE);
  const comments = page.locator('#comments');
  await comments.scrollIntoViewIfNeeded();

  await expect(comments.getByRole('link', { name: 'Sign in with GitHub' })).toBeVisible();
  await expect(comments.getByText(SEEDED_PENDING_COMMENT.body)).toHaveCount(0);

  await comments.getByRole('textbox', { name: 'Comment' }).fill('Hello from an anonymous reader');

  await expect(comments.locator('[data-fake-turnstile="rendered"]')).toBeAttached();
  await expect(comments.getByRole('button', { name: 'Post comment' })).toBeEnabled();
  expect(errors).toStrictEqual([]);
});

test('a signed-in visitor posts a comment that is published immediately', async ({ context, page }) => {
  await signInAsVisitor(context);
  const body = 'E2E: published straight away';
  await page.goto(COMMENT_TEST_PAGE);
  const comments = page.locator('#comments');
  await comments.scrollIntoViewIfNeeded();

  await expect(comments.getByText('Commenting as')).toContainText(`@${VISITOR_SESSION.githubLogin}`);

  await comments.getByRole('textbox', { name: 'Comment' }).fill(body);
  await comments.getByRole('button', { name: 'Post comment' }).click();

  await expect(comments.getByText(body)).toBeVisible();

  await page.reload();
  await page.locator('#comments').scrollIntoViewIfNeeded();

  await expect(page.locator('#comments').getByText(body)).toBeVisible();
});

test('the admin approves a pending comment, which then shows to everyone', async ({ browser }) => {
  const adminContext = await browser.newContext();
  await isolateFromThirdParties(adminContext);
  await signInAsAdmin(adminContext);
  const adminPage = await adminContext.newPage();
  await adminPage.goto('/admin/comments/');
  const pendingItem = adminPage.getByRole('listitem').filter({ hasText: SEEDED_PENDING_COMMENT.body }).last();
  await pendingItem.getByRole('button', { name: 'Approve' }).click();

  await expect(adminPage.getByRole('heading', { name: /^Recently published/ })).toBeVisible();
  await expect(pendingItem.getByRole('button', { name: 'Approve' })).toHaveCount(0);

  await adminContext.close();
  const readerContext = await browser.newContext();
  await isolateFromThirdParties(readerContext);
  const readerPage = await readerContext.newPage();
  await readerPage.goto(COMMENT_TEST_PAGE);
  await readerPage.locator('#comments').scrollIntoViewIfNeeded();

  await expect(readerPage.locator('#comments').getByText(SEEDED_PENDING_COMMENT.body)).toBeVisible();
  await readerContext.close();
});

test('the admin deletes a comment from the post page', async ({ context, page }) => {
  await signInAsAdmin(context);
  const body = 'E2E: written by the admin, then deleted';
  await page.goto(COMMENT_TEST_PAGE);
  const comments = page.locator('#comments');
  await comments.scrollIntoViewIfNeeded();
  await comments.getByRole('textbox', { name: 'Comment' }).fill(body);
  await comments.getByRole('button', { name: 'Post comment' }).click();
  const target = comments.getByRole('listitem').filter({ hasText: body });
  await target.getByRole('button', { name: 'Delete' }).click();

  await expect(target).toHaveCount(0);

  await page.reload();

  await expect(page.locator('#comments').getByText(body)).toHaveCount(0);
});
