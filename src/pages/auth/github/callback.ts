import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminGitHubUser } from '../../../features/auth/admin-identity';
import { exchangeCodeForAccessToken, fetchGitHubProfile } from '../../../features/auth/github-oauth';
import { takePendingSignIn } from '../../../features/auth/oauth-state-cookie';
import { writeSessionCookie } from '../../../features/auth/session-cookie';
import { createSession, deleteExpiredSessions } from '../../../features/auth/session-store';

export const prerender = false;

function plainTextResponse(status: number, message: string): Response {
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

export const GET: APIRoute = async ({ url, cookies, redirect, locals }) => {
  const pending = takePendingSignIn(cookies);
  const code = url.searchParams.get('code');
  if (!pending || !code || url.searchParams.get('state') !== pending.state) {
    return plainTextResponse(400, 'Sign-in expired or was tampered with. Please try again.');
  }

  const accessToken = await exchangeCodeForAccessToken({
    code,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    siteOrigin: url.origin,
  });
  const profile = accessToken ? await fetchGitHubProfile(accessToken) : null;
  if (!accessToken || !profile) {
    return plainTextResponse(502, 'GitHub sign-in failed. Please try again.');
  }

  if (pending.intent === 'admin' && !isAdminGitHubUser(profile.id)) {
    return plainTextResponse(403, 'Only the site owner can sign in to the admin area.');
  }

  const sessionToken = await createSession(env.DB, profile);
  writeSessionCookie(cookies, sessionToken, url.protocol === 'https:');
  locals.cfContext.waitUntil(deleteExpiredSessions(env.DB));
  return redirect(pending.returnPath);
};
