import { describe, expect, it, vi } from 'vitest';
import {
  buildAuthorizeUrl,
  callbackUrlFor,
  exchangeCodeForAccessToken,
  fetchGitHubProfile,
  GITHUB_OAUTH_CLIENT_ID,
} from '../../../src/features/auth/github-oauth';

function stubFetchOnce(response: Response) {
  const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

describe('GitHub OAuth', () => {
  it('builds the callback URL from the site origin', () => {
    expect(callbackUrlFor('https://zichaoyang.com')).toBe('https://zichaoyang.com/auth/github/callback');
  });

  it('builds an authorize URL that asks for no extra scopes', () => {
    const url = new URL(buildAuthorizeUrl({ siteOrigin: 'https://zichaoyang.com', state: 's1' }));

    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      client_id: GITHUB_OAUTH_CLIENT_ID,
      redirect_uri: 'https://zichaoyang.com/auth/github/callback',
      scope: '',
      state: 's1',
      allow_signup: 'true',
    });
  });

  it('exchanges a code for an access token', async () => {
    const fetchStub = stubFetchOnce(Response.json({ access_token: 'gho_token' }));

    await expect(
      exchangeCodeForAccessToken({ code: 'c', clientSecret: 'secret', siteOrigin: 'https://zichaoyang.com' }),
    ).resolves.toBe('gho_token');
    expect(fetchStub).toHaveBeenCalledExactlyOnceWith('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        client_secret: 'secret',
        code: 'c',
        redirect_uri: 'https://zichaoyang.com/auth/github/callback',
      }),
    });
  });

  it.each([
    { name: 'an error status', response: new Response('', { status: 500 }) },
    { name: 'a body without a token', response: Response.json({ error: 'bad_verification_code' }) },
  ])('returns null for $name', async ({ response }) => {
    stubFetchOnce(response);

    await expect(
      exchangeCodeForAccessToken({ code: 'c', clientSecret: 'secret', siteOrigin: 'https://zichaoyang.com' }),
    ).resolves.toBeNull();
  });

  it('maps the GitHub user to a profile', async () => {
    stubFetchOnce(Response.json({ id: 7, login: 'octo', avatar_url: 'https://avatars.test/7', name: 'ignored' }));

    await expect(fetchGitHubProfile('gho_token')).resolves.toStrictEqual({
      id: 7,
      login: 'octo',
      avatarUrl: 'https://avatars.test/7',
    });
  });

  it('returns null when GitHub rejects the token', async () => {
    stubFetchOnce(new Response('', { status: 401 }));

    await expect(fetchGitHubProfile('bad')).resolves.toBeNull();
  });
});
