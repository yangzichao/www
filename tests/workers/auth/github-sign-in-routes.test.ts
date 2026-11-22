import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { GITHUB_OAUTH_CLIENT_ID } from '../../../src/features/auth/github-oauth';
import { findSession } from '../../../src/features/auth/session-store';
import { decryptToken } from '../../../src/features/auth/token-encryption';
import { GET as callback } from '../../../src/pages/auth/github/callback';
import { GET as login } from '../../../src/pages/auth/github/login';
import { POST as logout } from '../../../src/pages/auth/logout';
import { TEST_GITHUB_CLIENT_SECRET } from '../../support/test-secrets';
import { callRoute, TEST_SITE_ORIGIN } from '../support/api-context';
import { ADMIN_PROFILE, resetDatabase, signInVisitor, VISITOR_PROFILE } from '../support/database';
import { stubOutboundFetch } from '../support/fetch-stub';

const ISSUED_ACCESS_TOKEN = 'gho_issued_by_github';

function stubGitHub(profile: { id: number; login: string; avatarUrl: string }) {
  return stubOutboundFetch((request) => {
    if (request.url === 'https://github.com/login/oauth/access_token') {
      return Response.json({ access_token: ISSUED_ACCESS_TOKEN });
    }
    if (request.url === 'https://api.github.com/user') {
      return Response.json({ id: profile.id, login: profile.login, avatar_url: profile.avatarUrl });
    }
    return new Response('unexpected request', { status: 500 });
  });
}

async function startSignIn(query: string) {
  const { response, cookies } = await callRoute(login, { path: `/auth/github/login?${query}` });
  const authorizeUrl = new URL(response.headers.get('location') ?? '');
  const stateCookie = cookies.valueOf('oauth_state') ?? '';
  return { response, cookies, authorizeUrl, stateCookie, state: authorizeUrl.searchParams.get('state') ?? '' };
}

async function finishSignIn(query: string, stateCookie: string) {
  return callRoute(callback, { path: `/auth/github/callback?${query}`, cookies: { oauth_state: stateCookie } });
}

describe('GET /auth/github/login', () => {
  it('redirects a commenter to GitHub with no extra scopes', async () => {
    const { response, authorizeUrl } = await startSignIn('intent=comment&return_to=/blog/a/%23comments');

    expect(response.status).toBe(302);
    expect(authorizeUrl.origin + authorizeUrl.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(authorizeUrl.searchParams.get('client_id')).toBe(GITHUB_OAUTH_CLIENT_ID);
    expect(authorizeUrl.searchParams.get('scope')).toBe('');
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe(`${TEST_SITE_ORIGIN}/auth/github/callback`);
  });

  it('asks for public repository access when signing in to the admin area', async () => {
    const { authorizeUrl } = await startSignIn('intent=admin&return_to=/admin/');

    expect(authorizeUrl.searchParams.get('scope')).toBe('public_repo');
  });

  it('stores a state cookie scoped to the callback that matches the state sent to GitHub', async () => {
    const { cookies, state, stateCookie } = await startSignIn('intent=comment');
    const pendingSignIn: unknown = JSON.parse(atob(stateCookie.replace(/-/g, '+').replace(/_/g, '/')));

    expect(state).toMatch(/^[\w-]{32}$/);
    expect(pendingSignIn).toStrictEqual({ state, intent: 'comment', returnPath: '/' });
    expect(cookies.writes[0]?.options).toMatchObject({ httpOnly: true, path: '/auth/github', sameSite: 'lax' });
  });
});

describe('GET /auth/github/callback', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('signs in a commenter without storing their GitHub token', async () => {
    stubGitHub(VISITOR_PROFILE);
    const { state, stateCookie } = await startSignIn('intent=comment&return_to=/blog/a/%23comments');
    const { response, cookies } = await finishSignIn(`code=abc&state=${state}`, stateCookie);
    const session = await findSession(env.DB, cookies.valueOf('session') ?? '');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/blog/a/#comments');
    expect(session?.user).toMatchObject({
      githubLogin: VISITOR_PROFILE.login,
      isAdmin: false,
      hasRepositoryAccess: false,
    });
    expect(session?.encryptedAccessToken).toBeNull();
  });

  it('signs in the admin with an encrypted repository token', async () => {
    const outbound = stubGitHub(ADMIN_PROFILE);
    const { state, stateCookie } = await startSignIn('intent=admin&return_to=/admin/');
    const { response, cookies } = await finishSignIn(`code=abc&state=${state}`, stateCookie);
    const session = await findSession(env.DB, cookies.valueOf('session') ?? '');

    expect(response.headers.get('location')).toBe('/admin/');
    expect(session?.user).toMatchObject({ isAdmin: true, hasRepositoryAccess: true });
    await expect(decryptToken(session?.encryptedAccessToken ?? '', env.TOKEN_ENCRYPTION_KEY)).resolves.toBe(
      ISSUED_ACCESS_TOKEN,
    );
    expect(JSON.parse(outbound[0]?.body ?? '{}')).toMatchObject({
      client_secret: TEST_GITHUB_CLIENT_SECRET,
      code: 'abc',
    });
  });

  it('refuses admin sign-in for anyone but the site owner', async () => {
    stubGitHub(VISITOR_PROFILE);
    const { state, stateCookie } = await startSignIn('intent=admin');
    const { response, cookies } = await finishSignIn(`code=abc&state=${state}`, stateCookie);

    expect(response.status).toBe(403);
    expect(cookies.valueOf('session')).toBeUndefined();
  });

  it('rejects a state that does not match the cookie', async () => {
    const outbound = stubGitHub(VISITOR_PROFILE);
    const { stateCookie } = await startSignIn('intent=comment');
    const { response } = await finishSignIn('code=abc&state=forged', stateCookie);

    expect(response.status).toBe(400);
    expect(outbound).toHaveLength(0);
  });

  it('rejects a callback with no pending sign-in', async () => {
    const { response } = await callRoute(callback, { path: '/auth/github/callback?code=abc&state=anything' });

    expect(response.status).toBe(400);
  });

  it('reports a failed token exchange as a bad gateway', async () => {
    stubOutboundFetch(() => new Response('nope', { status: 500 }));
    const { state, stateCookie } = await startSignIn('intent=comment');
    const { response } = await finishSignIn(`code=abc&state=${state}`, stateCookie);

    expect(response.status).toBe(502);
  });

  it('never redirects off-site after sign-in', async () => {
    stubGitHub(VISITOR_PROFILE);
    const { state, stateCookie } = await startSignIn('intent=comment&return_to=%2F%09%2Fevil.example');
    const { response } = await finishSignIn(`code=abc&state=${state}`, stateCookie);
    const location = new URL(response.headers.get('location') ?? '', TEST_SITE_ORIGIN);

    expect(location.origin).toBe(TEST_SITE_ORIGIN);
  });
});

describe('POST /auth/logout', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('deletes the session and clears the cookie', async () => {
    const cookies = await signInVisitor();
    const { response, cookies: jar } = await callRoute(logout, { method: 'POST', path: '/auth/logout', cookies });

    expect(response.status).toBe(200);
    expect(jar.deletions).toStrictEqual(['session']);
    await expect(findSession(env.DB, cookies.session ?? '')).resolves.toBeNull();
  });

  it('rejects cross-origin sign-out', async () => {
    const cookies = await signInVisitor();
    const { response } = await callRoute(logout, { method: 'POST', path: '/auth/logout', cookies, sameOrigin: false });

    expect(response.status).toBe(403);
    await expect(findSession(env.DB, cookies.session ?? '')).resolves.not.toBeNull();
  });
});
