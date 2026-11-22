import type { AstroCookies } from 'astro';
import { env } from 'cloudflare:workers';
import { readSessionToken } from './session-cookie';
import { findSession, type StoredSession } from './session-store';
import { decryptToken } from './token-encryption';
import type { SessionUser } from './session-user';

export async function loadCurrentSession(cookies: AstroCookies): Promise<StoredSession | null> {
  const sessionToken = readSessionToken(cookies);
  if (!sessionToken) return null;
  return findSession(env.DB, sessionToken);
}

export async function loadCurrentUser(cookies: AstroCookies): Promise<SessionUser | null> {
  return (await loadCurrentSession(cookies))?.user ?? null;
}

export async function loadAdminAccessToken(cookies: AstroCookies): Promise<string | null> {
  const session = await loadCurrentSession(cookies);
  if (!session?.user.isAdmin || !session.encryptedAccessToken) return null;
  return decryptToken(session.encryptedAccessToken, env.TOKEN_ENCRYPTION_KEY);
}
