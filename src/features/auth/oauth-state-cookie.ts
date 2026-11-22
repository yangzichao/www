import type { AstroCookies } from 'astro';
import { base64UrlToBytes, bytesToBase64Url, randomBase64Url } from '../http/base64';
import { parseSignInIntent, type SignInIntent } from './sign-in-intent';
import { sanitizeReturnPath } from './return-path';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE_SECONDS = 600;

export interface PendingSignIn {
  state: string;
  intent: SignInIntent;
  returnPath: string;
}

export function startPendingSignIn(
  cookies: AstroCookies,
  options: { intent: SignInIntent; returnPath: string; secure: boolean },
): PendingSignIn {
  const pending: PendingSignIn = { state: randomBase64Url(24), intent: options.intent, returnPath: options.returnPath };
  cookies.set(OAUTH_STATE_COOKIE, bytesToBase64Url(new TextEncoder().encode(JSON.stringify(pending))), {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    path: '/auth/github',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
  return pending;
}

export function takePendingSignIn(cookies: AstroCookies): PendingSignIn | null {
  const raw = cookies.get(OAUTH_STATE_COOKIE)?.value;
  cookies.delete(OAUTH_STATE_COOKIE, { path: '/auth/github' });
  if (!raw) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(raw))) as Partial<PendingSignIn>;
    if (typeof parsed.state !== 'string') return null;
    return {
      state: parsed.state,
      intent: parseSignInIntent(parsed.intent ?? null),
      returnPath: sanitizeReturnPath(parsed.returnPath),
    };
  } catch {
    return null;
  }
}
