import type { PostHeading } from '../rendering/post-heading';
import type { Post, PostSummary, PostTimestampPrecision } from '../post-types';

export interface PostSummaryRow {
  id: string;
  path: string;
  title: string;
  description: string | null;
  venue: string | null;
  tags: string;
  created_at: string;
  timestamp_precision: PostTimestampPrecision;
  updated_at: string | null;
  is_public: number;
}

export interface PostRow extends PostSummaryRow {
  body_markdown: string;
  body_html: string;
  headings: string;
}

export const POST_SUMMARY_COLUMNS =
  'id, path, title, description, venue, tags, created_at, timestamp_precision, updated_at, is_public';

export const POST_COLUMNS = `${POST_SUMMARY_COLUMNS}, body_markdown, body_html, headings`;

function parseJsonList(storedJson: string): unknown[] {
  const parsed: unknown = JSON.parse(storedJson);
  return Array.isArray(parsed) ? parsed : [];
}

export function toPostSummary(row: PostSummaryRow): PostSummary {
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    description: row.description,
    venue: row.venue,
    tags: parseJsonList(row.tags).filter((tag): tag is string => typeof tag === 'string'),
    createdAt: row.created_at,
    timestampPrecision: row.timestamp_precision,
    updatedAt: row.updated_at,
    isPublic: row.is_public === 1,
  };
}

export function toPost(row: PostRow): Post {
  return {
    ...toPostSummary(row),
    bodyMarkdown: row.body_markdown,
    bodyHtml: row.body_html,
    headings: parseJsonList(row.headings) as PostHeading[],
  };
}

export function toSqliteBoolean(value: boolean): number {
  return value ? 1 : 0;
}
