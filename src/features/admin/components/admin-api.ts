import type { PublicComment } from '../../comments/comment-types';

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

export async function fetchModerationQueue(): Promise<{ pending: PublicComment[]; recent: PublicComment[] }> {
  return readJsonOrThrow(await fetch('/api/admin/comments'));
}
