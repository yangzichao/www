export const GITHUB_OAUTH_CLIENT_ID = 'Ov23liDMm2waJCgFRlT7';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_API_USER_AGENT = 'zichaoyang.com';

export interface GitHubProfile {
  id: number;
  login: string;
  avatarUrl: string;
}

export function callbackUrlFor(siteOrigin: string): string {
  return new URL('/auth/github/callback', siteOrigin).toString();
}

const PUBLIC_PROFILE_ONLY_SCOPE = '';

export function buildAuthorizeUrl(options: { siteOrigin: string; state: string }): string {
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set('client_id', GITHUB_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', callbackUrlFor(options.siteOrigin));
  url.searchParams.set('scope', PUBLIC_PROFILE_ONLY_SCOPE);
  url.searchParams.set('state', options.state);
  url.searchParams.set('allow_signup', 'true');
  return url.toString();
}

export async function exchangeCodeForAccessToken(options: {
  code: string;
  clientSecret: string;
  siteOrigin: string;
}): Promise<string | null> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_OAUTH_CLIENT_ID,
      client_secret: options.clientSecret,
      code: options.code,
      redirect_uri: callbackUrlFor(options.siteOrigin),
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json<{ access_token?: string }>();
  return payload.access_token ?? null;
}

export async function fetchGitHubProfile(accessToken: string): Promise<GitHubProfile | null> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': GITHUB_API_USER_AGENT,
    },
  });
  if (!response.ok) return null;
  const user = await response.json<{ id: number; login: string; avatar_url: string }>();
  return { id: user.id, login: user.login, avatarUrl: user.avatar_url };
}
