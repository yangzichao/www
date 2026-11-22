import { beforeEach, describe, expect, it } from 'vitest';
import { checkAdminPageAccess } from '../../../src/features/admin/admin-page-guard';
import { loadAdminAccessToken } from '../../../src/features/auth/current-session';
import { FakeCookieJar } from '../../support/fake-cookies';
import {
  ADMIN_GITHUB_ACCESS_TOKEN,
  resetDatabase,
  signInAdminWithoutRepositoryAccess,
  signInAdminWithRepositoryAccess,
  signInVisitor,
} from '../support/database';

const EDITOR_PAGE = { requiresRepositoryAccess: true };
const MODERATION_PAGE = { requiresRepositoryAccess: false };
const SIGN_IN_REDIRECT = { kind: 'redirect', location: '/auth/github/login?intent=admin&return_to=%2Fadmin%2F' };

function cookiesFrom(values: Record<string, string> = {}) {
  return new FakeCookieJar(values).asAstroCookies();
}

describe('checkAdminPageAccess', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('sends a signed-out reader to admin sign-in', async () => {
    await expect(checkAdminPageAccess(cookiesFrom(), '/admin/', EDITOR_PAGE)).resolves.toStrictEqual(SIGN_IN_REDIRECT);
  });

  it('sends a visitor to admin sign-in', async () => {
    await expect(
      checkAdminPageAccess(cookiesFrom(await signInVisitor()), '/admin/', MODERATION_PAGE),
    ).resolves.toStrictEqual(SIGN_IN_REDIRECT);
  });

  it('lets an admin without repository access moderate but not edit', async () => {
    const cookies = cookiesFrom(await signInAdminWithoutRepositoryAccess());

    await expect(checkAdminPageAccess(cookies, '/admin/', MODERATION_PAGE)).resolves.toMatchObject({ kind: 'granted' });
    await expect(checkAdminPageAccess(cookies, '/admin/', EDITOR_PAGE)).resolves.toStrictEqual(SIGN_IN_REDIRECT);
  });

  it('lets an admin with repository access edit', async () => {
    const cookies = cookiesFrom(await signInAdminWithRepositoryAccess());

    await expect(checkAdminPageAccess(cookies, '/admin/', EDITOR_PAGE)).resolves.toMatchObject({ kind: 'granted' });
  });
});

describe('loadAdminAccessToken', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('decrypts the stored token for the admin', async () => {
    await expect(loadAdminAccessToken(cookiesFrom(await signInAdminWithRepositoryAccess()))).resolves.toBe(
      ADMIN_GITHUB_ACCESS_TOKEN,
    );
  });

  it('returns nothing for an admin session without a token or for a visitor', async () => {
    await expect(loadAdminAccessToken(cookiesFrom(await signInAdminWithoutRepositoryAccess()))).resolves.toBeNull();
    await expect(loadAdminAccessToken(cookiesFrom(await signInVisitor()))).resolves.toBeNull();
    await expect(loadAdminAccessToken(cookiesFrom())).resolves.toBeNull();
  });
});
