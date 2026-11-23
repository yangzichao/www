import { readJsonOrThrow } from '../../http/read-json-or-throw';
import type { PostResponse, PostSubmission } from '../post-types';

function jsonRequest(method: string, submission: PostSubmission): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(submission) };
}

function postApiUrl(postId: string): string {
  return `/api/posts/${encodeURIComponent(postId)}`;
}

export async function createPost(submission: PostSubmission): Promise<PostResponse> {
  return readJsonOrThrow<PostResponse>(await fetch('/api/posts', jsonRequest('POST', submission)));
}

export async function savePost(postId: string, submission: PostSubmission): Promise<PostResponse> {
  return readJsonOrThrow<PostResponse>(await fetch(postApiUrl(postId), jsonRequest('PATCH', submission)));
}

export async function deletePostById(postId: string): Promise<void> {
  await readJsonOrThrow(await fetch(postApiUrl(postId), { method: 'DELETE' }));
}
