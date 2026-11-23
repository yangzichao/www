import type { APIRoute } from 'astro';
import { buildAuthorizeUrl } from '../../../features/auth/github-oauth';
import { startPendingSignIn } from '../../../features/auth/oauth-state-cookie';
import { sanitizeReturnPath } from '../../../features/auth/return-path';
import { parseSignInIntent } from '../../../features/auth/sign-in-intent';

export const prerender = false;

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const intent = parseSignInIntent(url.searchParams.get('intent'));
  const pending = startPendingSignIn(cookies, {
    intent,
    returnPath: sanitizeReturnPath(url.searchParams.get('return_to')),
    secure: url.protocol === 'https:',
  });
  return redirect(buildAuthorizeUrl({ siteOrigin: url.origin, state: pending.state }));
};
