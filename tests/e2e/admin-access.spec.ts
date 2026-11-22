import { expect, test } from '@playwright/test';
import { ADMIN_SESSION, VISITOR_SESSION } from './support/e2e-fixtures.ts';

function sessionCookie(token: string) {
  return { cookie: `session=${token}` };
}

test('the admin editor sends signed-out readers to GitHub sign-in', async ({ request }) => {
  const response = await request.get('/admin/', { maxRedirects: 0 });

  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe('/auth/github/login?intent=admin&return_to=%2Fadmin%2F');
});

test('admin sign-in asks GitHub for public repository access with a state cookie', async ({ request }) => {
  const response = await request.get('/auth/github/login?intent=admin&return_to=%2Fadmin%2F', { maxRedirects: 0 });
  const authorizeUrl = new URL(response.headers().location ?? '');

  expect(response.status()).toBe(302);
  expect(authorizeUrl.origin + authorizeUrl.pathname).toBe('https://github.com/login/oauth/authorize');
  expect(authorizeUrl.searchParams.get('scope')).toBe('public_repo');
  expect(authorizeUrl.searchParams.get('redirect_uri')).toBe('http://localhost:8790/auth/github/callback');
  expect(response.headers()['set-cookie']).toMatch(/oauth_state=.*HttpOnly/i);
});

test('visitors cannot reach the moderation page', async ({ request }) => {
  const response = await request.get('/admin/comments/', {
    maxRedirects: 0,
    headers: sessionCookie(VISITOR_SESSION.token),
  });

  expect(response.status()).toBe(302);
});

test('the editor needs repository access even for the admin', async ({ request }) => {
  const response = await request.get('/admin/', { maxRedirects: 0, headers: sessionCookie(ADMIN_SESSION.token) });

  expect(response.status()).toBe(302);
});

test('the moderation page opens for the admin', async ({ request }) => {
  const response = await request.get('/admin/comments/', {
    maxRedirects: 0,
    headers: sessionCookie(ADMIN_SESSION.token),
  });

  expect(response.status()).toBe(200);
});

test('moderation APIs reject cross-site requests even with an admin cookie', async ({ request }) => {
  const response = await request.delete('/api/comments/anything', {
    headers: { ...sessionCookie(ADMIN_SESSION.token), origin: 'https://evil.example' },
  });

  expect(response.status()).toBe(403);
});
