import type { AstroCookies } from 'astro';
import { sessionLifetimeSeconds } from './session-store';

const SESSION_COOKIE = 'session';

export function readSessionToken(cookies: AstroCookies): string | null {
  return cookies.get(SESSION_COOKIE)?.value ?? null;
}

export function writeSessionCookie(cookies: AstroCookies, sessionToken: string, secure: boolean) {
  cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: sessionLifetimeSeconds(),
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
