import type { CommentAuthorKind, CommentStatus, PublicComment } from './comment-types';

interface CommentRow {
  id: string;
  page_path: string;
  body: string;
  author_kind: CommentAuthorKind;
  author_name: string;
  github_login: string | null;
  github_avatar_url: string | null;
  status: CommentStatus;
  created_at: string;
}

const COMMENT_COLUMNS =
  'id, page_path, body, author_kind, author_name, github_login, github_avatar_url, status, created_at';

function toPublicComment(row: CommentRow): PublicComment {
  return {
    id: row.id,
    pagePath: row.page_path,
    body: row.body,
    authorKind: row.author_kind,
    authorName: row.author_name,
    githubLogin: row.github_login,
    githubAvatarUrl: row.github_avatar_url,
    status: row.status,
    createdAt: row.created_at,
  };
}

export interface NewComment {
  pagePath: string;
  body: string;
  authorKind: CommentAuthorKind;
  authorName: string;
  githubLogin: string | null;
  githubAvatarUrl: string | null;
  status: CommentStatus;
}

export async function insertComment(database: D1Database, newComment: NewComment): Promise<PublicComment> {
  const row: CommentRow = {
    id: crypto.randomUUID(),
    page_path: newComment.pagePath,
    body: newComment.body,
    author_kind: newComment.authorKind,
    author_name: newComment.authorName,
    github_login: newComment.githubLogin,
    github_avatar_url: newComment.githubAvatarUrl,
    status: newComment.status,
    created_at: new Date().toISOString(),
  };
  await database
    .prepare(`INSERT INTO comments (${COMMENT_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
    .bind(
      row.id,
      row.page_path,
      row.body,
      row.author_kind,
      row.author_name,
      row.github_login,
      row.github_avatar_url,
      row.status,
      row.created_at,
    )
    .run();
  return toPublicComment(row);
}

export async function listCommentsForPage(
  database: D1Database,
  pagePath: string,
  options: { includePending: boolean },
): Promise<PublicComment[]> {
  const statusFilter = options.includePending ? '' : "AND status = 'published'";
  const { results } = await database
    .prepare(
      `SELECT ${COMMENT_COLUMNS} FROM comments WHERE page_path = ?1 ${statusFilter} ORDER BY created_at ASC, id ASC`,
    )
    .bind(pagePath)
    .all<CommentRow>();
  return results.map(toPublicComment);
}

export async function listPendingComments(database: D1Database): Promise<PublicComment[]> {
  const { results } = await database
    .prepare(`SELECT ${COMMENT_COLUMNS} FROM comments WHERE status = 'pending' ORDER BY created_at ASC, id ASC`)
    .all<CommentRow>();
  return results.map(toPublicComment);
}

export async function listRecentPublishedComments(database: D1Database, limit: number): Promise<PublicComment[]> {
  const { results } = await database
    .prepare(
      `SELECT ${COMMENT_COLUMNS} FROM comments WHERE status = 'published' ORDER BY created_at DESC, id DESC LIMIT ?1`,
    )
    .bind(limit)
    .all<CommentRow>();
  return results.map(toPublicComment);
}

export async function approveComment(database: D1Database, commentId: string): Promise<boolean> {
  const outcome = await database
    .prepare("UPDATE comments SET status = 'published' WHERE id = ?1 AND status = 'pending'")
    .bind(commentId)
    .run();
  return outcome.meta.changes > 0;
}

export async function deleteComment(database: D1Database, commentId: string): Promise<boolean> {
  const outcome = await database.prepare('DELETE FROM comments WHERE id = ?1').bind(commentId).run();
  return outcome.meta.changes > 0;
}
