import { beforeEach, describe, expect, it } from 'vitest';
import { checkAdminPageAccess } from '../../../src/features/admin/admin-page-guard';
import { FakeCookieJar } from '../../support/fake-cookies';
import { resetDatabase, signInAdmin, signInVisitor } from '../support/database';

const SIGN_IN_REDIRECT = { kind: 'redirect', location: '/auth/github/login?intent=admin&return_to=%2Fadmin%2F' };

function cookiesFrom(values: Record<string, string> = {}) {
  return new FakeCookieJar(values).asAstroCookies();
}

describe('checkAdminPageAccess', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('sends a signed-out reader to admin sign-in', async () => {
    await expect(checkAdminPageAccess(cookiesFrom(), '/admin/')).resolves.toStrictEqual(SIGN_IN_REDIRECT);
  });

  it('sends a visitor to admin sign-in', async () => {
    await expect(checkAdminPageAccess(cookiesFrom(await signInVisitor()), '/admin/')).resolves.toStrictEqual(
      SIGN_IN_REDIRECT,
    );
  });

  it('grants the admin', async () => {
    await expect(checkAdminPageAccess(cookiesFrom(await signInAdmin()), '/admin/')).resolves.toMatchObject({
      kind: 'granted',
      user: { isAdmin: true },
    });
  });
});
