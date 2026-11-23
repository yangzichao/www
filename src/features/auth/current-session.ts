import type { AstroCookies } from 'astro';
import { env } from 'cloudflare:workers';
import { readSessionToken } from './session-cookie';
import { findSessionUser } from './session-store';
import type { SessionUser } from './session-user';

export async function loadCurrentUser(cookies: AstroCookies): Promise<SessionUser | null> {
  const sessionToken = readSessionToken(cookies);
  if (!sessionToken) return null;
  return findSessionUser(env.DB, sessionToken);
}
