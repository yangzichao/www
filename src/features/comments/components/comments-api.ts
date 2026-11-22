import type { CommentThreadResponse, CreateCommentResponse } from '../comment-types';

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed with ${response.status}`);
  return payload;
}

export async function fetchCommentThread(pagePath: string): Promise<CommentThreadResponse> {
  const response = await fetch(`/api/comments?${new URLSearchParams({ path: pagePath })}`);
  return readJsonOrThrow<CommentThreadResponse>(response);
}

export async function postComment(submission: {
  pagePath: string;
  body: string;
  authorName: string;
  turnstileToken: string | null;
}): Promise<CreateCommentResponse> {
  const response = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(submission),
  });
  return readJsonOrThrow<CreateCommentResponse>(response);
}

export async function approveCommentById(commentId: string): Promise<void> {
  await readJsonOrThrow(await fetch(`/api/comments/${encodeURIComponent(commentId)}/approve`, { method: 'POST' }));
}

export async function deleteCommentById(commentId: string): Promise<void> {
  await readJsonOrThrow(await fetch(`/api/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }));
}

export async function signOut(): Promise<void> {
  await readJsonOrThrow(await fetch('/auth/logout', { method: 'POST' }));
}
