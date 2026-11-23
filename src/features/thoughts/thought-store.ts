import type { Thought, ThoughtSubmission, ThoughtTimestampPrecision } from './thought-types';

interface ThoughtRow {
  id: string;
  body: string;
  tags: string;
  created_at: string;
  updated_at: string | null;
  timestamp_precision: ThoughtTimestampPrecision;
  is_public: number;
}

const THOUGHT_COLUMNS = 'id, body, tags, created_at, updated_at, timestamp_precision, is_public';

function parseStoredTags(storedTags: string): string[] {
  const parsed: unknown = JSON.parse(storedTags);
  return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
}

function toThought(row: ThoughtRow): Thought {
  return {
    id: row.id,
    body: row.body,
    tags: parseStoredTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timestampPrecision: row.timestamp_precision,
    isPublic: row.is_public === 1,
  };
}

function toSqliteBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export async function insertThought(database: D1Database, submission: ThoughtSubmission): Promise<Thought> {
  const row: ThoughtRow = {
    id: crypto.randomUUID(),
    body: submission.body,
    tags: JSON.stringify(submission.tags),
    created_at: new Date().toISOString(),
    updated_at: null,
    timestamp_precision: 'exact',
    is_public: toSqliteBoolean(submission.isPublic),
  };
  await database
    .prepare(`INSERT INTO thoughts (${THOUGHT_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(row.id, row.body, row.tags, row.created_at, row.updated_at, row.timestamp_precision, row.is_public)
    .run();
  return toThought(row);
}

export async function updateThought(
  database: D1Database,
  thoughtId: string,
  submission: ThoughtSubmission,
): Promise<Thought | null> {
  const row = await database
    .prepare(
      `UPDATE thoughts
       SET updated_at = CASE WHEN body = ?2 AND tags = ?3 THEN updated_at ELSE ?4 END,
           body = ?2,
           tags = ?3,
           is_public = ?5
       WHERE id = ?1
       RETURNING ${THOUGHT_COLUMNS}`,
    )
    .bind(
      thoughtId,
      submission.body,
      JSON.stringify(submission.tags),
      new Date().toISOString(),
      toSqliteBoolean(submission.isPublic),
    )
    .first<ThoughtRow>();
  return row ? toThought(row) : null;
}

export interface ThoughtListAudience {
  includePrivate: boolean;
}

export async function listThoughtsNewestFirst(database: D1Database, audience: ThoughtListAudience): Promise<Thought[]> {
  const { results } = await database
    .prepare(`SELECT ${THOUGHT_COLUMNS} FROM thoughts WHERE is_public = 1 OR ?1 = 1 ORDER BY created_at DESC, id DESC`)
    .bind(toSqliteBoolean(audience.includePrivate))
    .all<ThoughtRow>();
  return results.map(toThought);
}

export async function deleteThought(database: D1Database, thoughtId: string): Promise<boolean> {
  const outcome = await database.prepare('DELETE FROM thoughts WHERE id = ?1').bind(thoughtId).run();
  return outcome.meta.changes > 0;
}
