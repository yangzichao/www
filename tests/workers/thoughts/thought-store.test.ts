import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteThought, insertThought, listThoughtsNewestFirst } from '../../../src/features/thoughts/thought-store';
import { resetDatabase } from '../support/database';

async function insertAt(isoTimestamp: string, body: string) {
  vi.setSystemTime(new Date(isoTimestamp));
  return insertThought(env.DB, { body, tags: ['ai'] });
}

describe('thought store', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await resetDatabase();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores a new thought with an exact timestamp and its tags', async () => {
    const created = await insertAt('2026-11-22T20:00:00.000Z', 'An idea.');

    expect(created).toMatchObject({
      body: 'An idea.',
      tags: ['ai'],
      createdAt: '2026-11-22T20:00:00.000Z',
      timestampPrecision: 'exact',
    });
    await expect(listThoughtsNewestFirst(env.DB)).resolves.toStrictEqual([created]);
  });

  it('lists thoughts newest first', async () => {
    await insertAt('2026-11-01T00:00:00.000Z', 'older');
    await insertAt('2026-11-22T00:00:00.000Z', 'newer');

    const bodies = (await listThoughtsNewestFirst(env.DB)).map((thought) => thought.body);

    expect(bodies).toStrictEqual(['newer', 'older']);
  });

  it('reads legacy rows whose tags column is not a list as untagged', async () => {
    await env.DB.prepare(
      "INSERT INTO thoughts (id, body, tags, created_at, timestamp_precision) VALUES ('legacy', 'old', '{}', '2026-03-01T00:00:00.000Z', 'month')",
    ).run();

    await expect(listThoughtsNewestFirst(env.DB)).resolves.toStrictEqual([
      { id: 'legacy', body: 'old', tags: [], createdAt: '2026-03-01T00:00:00.000Z', timestampPrecision: 'month' },
    ]);
  });

  it('deletes a thought and reports whether it existed', async () => {
    const created = await insertAt('2026-11-22T00:00:00.000Z', 'temporary');

    await expect(deleteThought(env.DB, created.id)).resolves.toBe(true);
    await expect(deleteThought(env.DB, created.id)).resolves.toBe(false);
    await expect(listThoughtsNewestFirst(env.DB)).resolves.toStrictEqual([]);
  });
});
