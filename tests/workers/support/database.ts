import { env } from 'cloudflare:workers';
import { createSession } from '../../../src/features/auth/session-store';
import { ADMIN_GITHUB_LOGIN, ADMIN_GITHUB_USER_ID } from '../../../src/features/auth/admin-identity';
import { encryptToken } from '../../../src/features/auth/token-encryption';

const TABLES = ['thoughts', 'comments', 'sessions', 'daily_page_views'];

export const VISITOR_PROFILE = { id: 1001, login: 'friendly-visitor', avatarUrl: 'https://avatars.test/u/1001' };
export const ADMIN_PROFILE = {
  id: ADMIN_GITHUB_USER_ID,
  login: ADMIN_GITHUB_LOGIN,
  avatarUrl: 'https://avatars.test/u/admin',
};
export const ADMIN_GITHUB_ACCESS_TOKEN = 'gho_test_admin_access_token';

export async function resetDatabase(): Promise<void> {
  await env.DB.batch(TABLES.map((table) => env.DB.prepare(`DELETE FROM ${table}`)));
}

export async function signInVisitor(): Promise<Record<string, string>> {
  return { session: await createSession(env.DB, VISITOR_PROFILE, null) };
}

export async function signInAdminWithoutRepositoryAccess(): Promise<Record<string, string>> {
  return { session: await createSession(env.DB, ADMIN_PROFILE, null) };
}

export async function signInAdminWithRepositoryAccess(): Promise<Record<string, string>> {
  const encryptedToken = await encryptToken(ADMIN_GITHUB_ACCESS_TOKEN, env.TOKEN_ENCRYPTION_KEY);
  return { session: await createSession(env.DB, ADMIN_PROFILE, encryptedToken) };
}
