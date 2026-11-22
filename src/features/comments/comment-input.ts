import { DEFAULT_ANONYMOUS_AUTHOR_NAME, MAX_AUTHOR_NAME_LENGTH, MAX_COMMENT_BODY_LENGTH } from './comment-limits';

export interface CommentSubmission {
  pagePath: string;
  body: string;
  authorName: string;
  turnstileToken: string | null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function parseCommentSubmission(payload: unknown): CommentSubmission | string {
  if (typeof payload !== 'object' || payload === null) return 'Request body must be a JSON object.';
  const fields = payload as Record<string, unknown>;
  const body = readString(fields.body).trim();
  if (body.length === 0) return 'Comment cannot be empty.';
  if (body.length > MAX_COMMENT_BODY_LENGTH) return `Comment must be at most ${MAX_COMMENT_BODY_LENGTH} characters.`;
  const authorName = readString(fields.authorName).trim().slice(0, MAX_AUTHOR_NAME_LENGTH);
  const turnstileToken = readString(fields.turnstileToken);
  return {
    pagePath: readString(fields.pagePath),
    body,
    authorName: authorName || DEFAULT_ANONYMOUS_AUTHOR_NAME,
    turnstileToken: turnstileToken || null,
  };
}
