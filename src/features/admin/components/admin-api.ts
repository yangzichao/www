import type { PublicComment } from '../../comments/comment-types';
import type { PostFileContent, PostFileSummary, SavePostRequest, SavePostResponse } from '../post-file-types';

export class AdminRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok)
    throw new AdminRequestError(response.status, payload.error ?? `Request failed with ${response.status}`);
  return payload;
}

export async function fetchPostFiles(): Promise<PostFileSummary[]> {
  return (await readJsonOrThrow<{ posts: PostFileSummary[] }>(await fetch('/api/admin/posts'))).posts;
}

export async function fetchPostFile(path: string): Promise<PostFileContent> {
  return readJsonOrThrow<PostFileContent>(await fetch(`/api/admin/posts/file?${new URLSearchParams({ path })}`));
}

export async function savePostFile(saveRequest: SavePostRequest): Promise<SavePostResponse> {
  const response = await fetch('/api/admin/posts/file', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(saveRequest),
  });
  return readJsonOrThrow<SavePostResponse>(response);
}

export async function fetchModerationQueue(): Promise<{ pending: PublicComment[]; recent: PublicComment[] }> {
  return readJsonOrThrow(await fetch('/api/admin/comments'));
}
