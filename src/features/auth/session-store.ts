import { randomBase64Url } from '../http/base64';
import { isAdminGitHubUser } from './admin-identity';
import type { GitHubProfile } from './github-oauth';
import type { SessionUser } from './session-user';

const SESSION_LIFETIME_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

interface SessionRow {
  github_user_id: number;
  github_login: string;
  github_avatar_url: string;
}

async function hashSessionToken(sessionToken: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionToken));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function sessionLifetimeSeconds(): number {
  return SESSION_LIFETIME_MILLISECONDS / 1000;
}

export async function createSession(database: D1Database, profile: GitHubProfile): Promise<string> {
  const sessionToken = randomBase64Url(32);
  const now = Date.now();
  await database
    .prepare(
      `INSERT INTO sessions (id_hash, github_user_id, github_login, github_avatar_url, created_at, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      await hashSessionToken(sessionToken),
      profile.id,
      profile.login,
      profile.avatarUrl,
      new Date(now).toISOString(),
      new Date(now + SESSION_LIFETIME_MILLISECONDS).toISOString(),
    )
    .run();
  return sessionToken;
}

export async function findSessionUser(database: D1Database, sessionToken: string): Promise<SessionUser | null> {
  const row = await database
    .prepare(
      `SELECT github_user_id, github_login, github_avatar_url
       FROM sessions WHERE id_hash = ?1 AND expires_at > ?2`,
    )
    .bind(await hashSessionToken(sessionToken), new Date().toISOString())
    .first<SessionRow>();
  if (!row) return null;
  return {
    githubUserId: row.github_user_id,
    githubLogin: row.github_login,
    githubAvatarUrl: row.github_avatar_url,
    isAdmin: isAdminGitHubUser(row.github_user_id),
  };
}

export async function deleteSession(database: D1Database, sessionToken: string): Promise<void> {
  await database
    .prepare('DELETE FROM sessions WHERE id_hash = ?1')
    .bind(await hashSessionToken(sessionToken))
    .run();
}

export async function deleteExpiredSessions(database: D1Database): Promise<void> {
  await database.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(new Date().toISOString()).run();
}
