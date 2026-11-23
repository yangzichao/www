import type { Post, PostSubmission, PostSummary } from '../post-types';
import {
  POST_COLUMNS,
  POST_SUMMARY_COLUMNS,
  toPost,
  toPostSummary,
  toSqliteBoolean,
  type PostRow,
  type PostSummaryRow,
} from './post-row';

export class PostPathTakenError extends Error {
  constructor(path: string) {
    super(`Another post already uses the path ${path}.`);
    this.name = 'PostPathTakenError';
  }
}

export interface PostAudience {
  includePrivate: boolean;
}

function isUniquePathViolation(error: unknown): boolean {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed: posts.path');
}

async function rethrowPathConflict<T>(path: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isUniquePathViolation(error)) throw new PostPathTakenError(path);
    throw error;
  }
}

function submissionColumns(submission: PostSubmission) {
  return [
    submission.path,
    submission.title,
    submission.description,
    submission.venue,
    JSON.stringify(submission.tags),
    submission.bodyMarkdown,
    submission.bodyHtml,
    JSON.stringify(submission.headings),
    toSqliteBoolean(submission.isPublic),
  ] as const;
}

export async function insertPost(database: D1Database, submission: PostSubmission): Promise<Post> {
  const statement = database
    .prepare(
      `INSERT INTO posts (path, title, description, venue, tags, body_markdown, body_html, headings, is_public, id, created_at, timestamp_precision)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'exact')
       RETURNING ${POST_COLUMNS}`,
    )
    .bind(...submissionColumns(submission), crypto.randomUUID(), new Date().toISOString());
  const row = await rethrowPathConflict(submission.path, () => statement.first<PostRow>());
  if (!row) throw new Error('Inserting the post returned no row.');
  return toPost(row);
}

export async function updatePost(
  database: D1Database,
  postId: string,
  submission: PostSubmission,
): Promise<Post | null> {
  const statement = database
    .prepare(
      `UPDATE posts
       SET updated_at = CASE
             WHEN path = ?1 AND title = ?2 AND description IS ?3 AND venue IS ?4 AND tags = ?5 AND body_markdown = ?6
             THEN updated_at
             ELSE ?11
           END,
           path = ?1, title = ?2, description = ?3, venue = ?4, tags = ?5,
           body_markdown = ?6, body_html = ?7, headings = ?8, is_public = ?9
       WHERE id = ?10
       RETURNING ${POST_COLUMNS}`,
    )
    .bind(...submissionColumns(submission), postId, new Date().toISOString());
  const row = await rethrowPathConflict(submission.path, () => statement.first<PostRow>());
  return row ? toPost(row) : null;
}

export async function deletePost(database: D1Database, postId: string): Promise<boolean> {
  const outcome = await database.prepare('DELETE FROM posts WHERE id = ?1').bind(postId).run();
  return outcome.meta.changes > 0;
}

export async function listPostSummaries(database: D1Database, audience: PostAudience): Promise<PostSummary[]> {
  const { results } = await database
    .prepare(
      `SELECT ${POST_SUMMARY_COLUMNS} FROM posts WHERE is_public = 1 OR ?1 = 1 ORDER BY created_at DESC, id DESC`,
    )
    .bind(toSqliteBoolean(audience.includePrivate))
    .all<PostSummaryRow>();
  return results.map(toPostSummary);
}

export async function listPostsWithBodies(database: D1Database): Promise<Post[]> {
  const { results } = await database
    .prepare(`SELECT ${POST_COLUMNS} FROM posts ORDER BY created_at DESC, id DESC`)
    .all<PostRow>();
  return results.map(toPost);
}

export async function findPostByPath(database: D1Database, path: string, audience: PostAudience): Promise<Post | null> {
  const row = await database
    .prepare(`SELECT ${POST_COLUMNS} FROM posts WHERE path = ?1 AND (is_public = 1 OR ?2 = 1)`)
    .bind(path, toSqliteBoolean(audience.includePrivate))
    .first<PostRow>();
  return row ? toPost(row) : null;
}

export async function findPostById(database: D1Database, postId: string): Promise<Post | null> {
  const row = await database.prepare(`SELECT ${POST_COLUMNS} FROM posts WHERE id = ?1`).bind(postId).first<PostRow>();
  return row ? toPost(row) : null;
}

export async function isPublicPostPath(database: D1Database, path: string): Promise<boolean> {
  const row = await database
    .prepare('SELECT 1 AS found FROM posts WHERE path = ?1 AND is_public = 1')
    .bind(path)
    .first<{ found: number }>();
  return row !== null;
}
