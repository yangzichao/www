import { readJsonOrThrow } from '../../http/read-json-or-throw';
import type { ThoughtResponse, ThoughtSubmission } from '../thought-types';

function jsonRequest(method: string, submission: ThoughtSubmission): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(submission) };
}

function thoughtUrl(thoughtId: string): string {
  return `/api/thoughts/${encodeURIComponent(thoughtId)}`;
}

export async function postThought(submission: ThoughtSubmission): Promise<ThoughtResponse> {
  return readJsonOrThrow<ThoughtResponse>(await fetch('/api/thoughts', jsonRequest('POST', submission)));
}

export async function patchThought(thoughtId: string, submission: ThoughtSubmission): Promise<ThoughtResponse> {
  return readJsonOrThrow<ThoughtResponse>(await fetch(thoughtUrl(thoughtId), jsonRequest('PATCH', submission)));
}

export async function deleteThoughtById(thoughtId: string): Promise<void> {
  await readJsonOrThrow(await fetch(thoughtUrl(thoughtId), { method: 'DELETE' }));
}
