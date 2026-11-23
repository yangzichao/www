import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSession,
  deleteExpiredSessions,
  deleteSession,
  findSessionUser,
  sessionLifetimeSeconds,
} from '../../../src/features/auth/session-store';
import { ADMIN_PROFILE, resetDatabase, VISITOR_PROFILE } from '../support/database';

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

describe('session store', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-01T00:00:00.000Z'));
    await resetDatabase();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lasts thirty days', () => {
    expect(sessionLifetimeSeconds()).toBe(THIRTY_DAYS_IN_SECONDS);
  });

  it('stores only a hash of the session token', async () => {
    const token = await createSession(env.DB, VISITOR_PROFILE);
    const stored = await env.DB.prepare('SELECT id_hash FROM sessions').first<{ id_hash: string }>();

    expect(stored?.id_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.id_hash).not.toContain(token);
  });

  it('finds a live session and derives admin access', async () => {
    const visitorToken = await createSession(env.DB, VISITOR_PROFILE);
    const adminToken = await createSession(env.DB, ADMIN_PROFILE);

    await expect(findSessionUser(env.DB, visitorToken)).resolves.toStrictEqual({
      githubUserId: VISITOR_PROFILE.id,
      githubLogin: VISITOR_PROFILE.login,
      githubAvatarUrl: VISITOR_PROFILE.avatarUrl,
      isAdmin: false,
    });
    await expect(findSessionUser(env.DB, adminToken)).resolves.toMatchObject({ isAdmin: true });
  });

  it('ignores unknown tokens', async () => {
    await expect(findSessionUser(env.DB, 'not-a-session')).resolves.toBeNull();
  });

  it('stops finding a session once it expires and cleans it up', async () => {
    const token = await createSession(env.DB, VISITOR_PROFILE);
    vi.setSystemTime(new Date('2026-12-01T00:00:00.000Z'));

    await expect(findSessionUser(env.DB, token)).resolves.toBeNull();

    await deleteExpiredSessions(env.DB);

    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM sessions').first('count')).resolves.toBe(0);
  });

  it('keeps live sessions when cleaning up expired ones', async () => {
    const token = await createSession(env.DB, VISITOR_PROFILE);
    await deleteExpiredSessions(env.DB);

    await expect(findSessionUser(env.DB, token)).resolves.not.toBeNull();
  });

  it('deletes a session by token', async () => {
    const token = await createSession(env.DB, VISITOR_PROFILE);
    await deleteSession(env.DB, token);

    await expect(findSessionUser(env.DB, token)).resolves.toBeNull();
  });
});
