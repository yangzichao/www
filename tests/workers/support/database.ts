import { env } from 'cloudflare:workers';
import { createSession } from '../../../src/features/auth/session-store';
import { ADMIN_GITHUB_LOGIN, ADMIN_GITHUB_USER_ID } from '../../../src/features/auth/admin-identity';

const TABLES = ['thoughts', 'comments', 'sessions', 'daily_page_views'];

export const VISITOR_PROFILE = { id: 1001, login: 'friendly-visitor', avatarUrl: 'https://avatars.test/u/1001' };
export const ADMIN_PROFILE = {
  id: ADMIN_GITHUB_USER_ID,
  login: ADMIN_GITHUB_LOGIN,
  avatarUrl: 'https://avatars.test/u/admin',
};

export async function resetDatabase(): Promise<void> {
  await env.DB.batch(TABLES.map((table) => env.DB.prepare(`DELETE FROM ${table}`)));
}

export async function signInVisitor(): Promise<Record<string, string>> {
  return { session: await createSession(env.DB, VISITOR_PROFILE) };
}

export async function signInAdmin(): Promise<Record<string, string>> {
  return { session: await createSession(env.DB, ADMIN_PROFILE) };
}

export const TEST_POST_CATEGORY = 'testing';

export async function deleteTestPosts(): Promise<void> {
  await env.DB.prepare('DELETE FROM posts WHERE path LIKE ?1').bind(`${TEST_POST_CATEGORY}/%`).run();
}
