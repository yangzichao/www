import type { PublicThought, ThoughtTimestampPrecision } from './thought-types';

interface ThoughtRow {
  id: string;
  body: string;
  tags: string;
  created_at: string;
  timestamp_precision: ThoughtTimestampPrecision;
}

const THOUGHT_COLUMNS = 'id, body, tags, created_at, timestamp_precision';

function parseStoredTags(storedTags: string): string[] {
  const parsed: unknown = JSON.parse(storedTags);
  return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
}

function toPublicThought(row: ThoughtRow): PublicThought {
  return {
    id: row.id,
    body: row.body,
    tags: parseStoredTags(row.tags),
    createdAt: row.created_at,
    timestampPrecision: row.timestamp_precision,
  };
}

export interface NewThought {
  body: string;
  tags: string[];
}

export async function insertThought(database: D1Database, newThought: NewThought): Promise<PublicThought> {
  const row: ThoughtRow = {
    id: crypto.randomUUID(),
    body: newThought.body,
    tags: JSON.stringify(newThought.tags),
    created_at: new Date().toISOString(),
    timestamp_precision: 'exact',
  };
  await database
    .prepare(`INSERT INTO thoughts (${THOUGHT_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5)`)
    .bind(row.id, row.body, row.tags, row.created_at, row.timestamp_precision)
    .run();
  return toPublicThought(row);
}

export async function listThoughtsNewestFirst(database: D1Database): Promise<PublicThought[]> {
  const { results } = await database
    .prepare(`SELECT ${THOUGHT_COLUMNS} FROM thoughts ORDER BY created_at DESC, id DESC`)
    .all<ThoughtRow>();
  return results.map(toPublicThought);
}

export async function deleteThought(database: D1Database, thoughtId: string): Promise<boolean> {
  const outcome = await database.prepare('DELETE FROM thoughts WHERE id = ?1').bind(thoughtId).run();
  return outcome.meta.changes > 0;
}
