import type { AstroCookies } from 'astro';
import { loadAdminAccessToken } from '../auth/current-session';
import { jsonError } from '../http/json-responses';
import { GitHubContentError } from './github-content-api';

export async function withAdminAccessToken(
  cookies: AstroCookies,
  handler: (accessToken: string) => Promise<Response>,
): Promise<Response> {
  const accessToken = await loadAdminAccessToken(cookies);
  if (!accessToken) return jsonError(401, 'Sign in as the site owner with repository access.');
  try {
    return await handler(accessToken);
  } catch (error) {
    if (error instanceof GitHubContentError) return jsonError(error.status, error.message);
    throw error;
  }
}
