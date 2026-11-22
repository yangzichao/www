import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { recordPageView } from '../../../src/features/page-views/page-view-store';
import { resetDatabase } from '../support/database';

describe('recordPageView', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('starts a new path at one view', async () => {
    await expect(recordPageView(env.DB, '/blog/a/', new Date('2026-11-20T10:00:00Z'))).resolves.toBe(1);
  });

  it('sums views across days for the same path', async () => {
    await recordPageView(env.DB, '/blog/a/', new Date('2026-11-20T10:00:00Z'));
    await recordPageView(env.DB, '/blog/a/', new Date('2026-11-20T23:59:59Z'));

    await expect(recordPageView(env.DB, '/blog/a/', new Date('2026-11-21T00:00:00Z'))).resolves.toBe(3);
  });

  it('keeps one row per UTC day and path', async () => {
    await recordPageView(env.DB, '/blog/a/', new Date('2026-11-20T10:00:00Z'));
    await recordPageView(env.DB, '/blog/a/', new Date('2026-11-20T11:00:00Z'));
    await recordPageView(env.DB, '/blog/a/', new Date('2026-11-21T01:00:00Z'));
    const { results } = await env.DB.prepare('SELECT day, views FROM daily_page_views ORDER BY day').all();

    expect(results).toStrictEqual([
      { day: '2026-11-20', views: 2 },
      { day: '2026-11-21', views: 1 },
    ]);
  });

  it('counts each path separately', async () => {
    await recordPageView(env.DB, '/blog/a/', new Date('2026-11-20T10:00:00Z'));

    await expect(recordPageView(env.DB, '/blog/b/', new Date('2026-11-20T10:00:00Z'))).resolves.toBe(1);
  });
});
