import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteThought,
  insertThought,
  listThoughtsNewestFirst,
  updateThought,
} from '../../../src/features/thoughts/thought-store';
import { resetDatabase } from '../support/database';

const EVERYONE = { includePrivate: false };
const ADMIN = { includePrivate: true };

async function insertAt(isoTimestamp: string, body: string, isPublic = true) {
  vi.setSystemTime(new Date(isoTimestamp));
  return insertThought(env.DB, { body, tags: ['ai'], isPublic });
}

describe('thought store', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await resetDatabase();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores a new thought with an exact timestamp, its tags, and no edit time', async () => {
    const created = await insertAt('2026-11-22T20:00:00.000Z', 'An idea.');

    expect(created).toMatchObject({
      body: 'An idea.',
      tags: ['ai'],
      createdAt: '2026-11-22T20:00:00.000Z',
      updatedAt: null,
      timestampPrecision: 'exact',
      isPublic: true,
    });
    await expect(listThoughtsNewestFirst(env.DB, EVERYONE)).resolves.toStrictEqual([created]);
  });

  it('lists thoughts newest first', async () => {
    await insertAt('2026-11-01T00:00:00.000Z', 'older');
    await insertAt('2026-11-22T00:00:00.000Z', 'newer');

    const bodies = (await listThoughtsNewestFirst(env.DB, EVERYONE)).map((thought) => thought.body);

    expect(bodies).toStrictEqual(['newer', 'older']);
  });

  it('hides private thoughts unless the audience includes them', async () => {
    await insertAt('2026-11-01T00:00:00.000Z', 'shared');
    await insertAt('2026-11-02T00:00:00.000Z', 'secret', false);

    const bodiesFor = async (audience: { includePrivate: boolean }) =>
      (await listThoughtsNewestFirst(env.DB, audience)).map((thought) => thought.body);

    await expect(bodiesFor(EVERYONE)).resolves.toStrictEqual(['shared']);
    await expect(bodiesFor(ADMIN)).resolves.toStrictEqual(['secret', 'shared']);
  });

  it('reads legacy rows as public and untagged when their tags column is not a list', async () => {
    await env.DB.prepare(
      "INSERT INTO thoughts (id, body, tags, created_at, timestamp_precision) VALUES ('legacy', 'old', '{}', '2026-03-01T00:00:00.000Z', 'month')",
    ).run();

    await expect(listThoughtsNewestFirst(env.DB, EVERYONE)).resolves.toStrictEqual([
      {
        id: 'legacy',
        body: 'old',
        tags: [],
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: null,
        timestampPrecision: 'month',
        isPublic: true,
      },
    ]);
  });

  it('records the edit time when the body or tags change', async () => {
    const created = await insertAt('2026-11-01T00:00:00.000Z', 'draft');
    vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'));

    const updated = await updateThought(env.DB, created.id, { body: 'final', tags: ['life'], isPublic: true });

    expect(updated).toStrictEqual({
      ...created,
      body: 'final',
      tags: ['life'],
      updatedAt: '2026-11-05T12:00:00.000Z',
    });
    await expect(listThoughtsNewestFirst(env.DB, EVERYONE)).resolves.toStrictEqual([updated]);
  });

  it('changes visibility without counting it as an edit', async () => {
    const created = await insertAt('2026-11-01T00:00:00.000Z', 'same words');
    vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'));

    const updated = await updateThought(env.DB, created.id, { body: 'same words', tags: ['ai'], isPublic: false });

    expect(updated).toStrictEqual({ ...created, isPublic: false });
  });

  it('returns null when updating a thought that does not exist', async () => {
    await expect(updateThought(env.DB, 'missing', { body: 'x', tags: [], isPublic: true })).resolves.toBeNull();
  });

  it('deletes a thought and reports whether it existed', async () => {
    const created = await insertAt('2026-11-22T00:00:00.000Z', 'temporary');

    await expect(deleteThought(env.DB, created.id)).resolves.toBe(true);
    await expect(deleteThought(env.DB, created.id)).resolves.toBe(false);
    await expect(listThoughtsNewestFirst(env.DB, ADMIN)).resolves.toStrictEqual([]);
  });
});
