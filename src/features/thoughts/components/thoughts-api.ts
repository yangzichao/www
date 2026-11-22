import { readJsonOrThrow } from '../../http/read-json-or-throw';
import type { CreateThoughtResponse } from '../thought-types';

export async function postThought(submission: { body: string; tags: string[] }): Promise<CreateThoughtResponse> {
  const response = await fetch('/api/thoughts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(submission),
  });
  return readJsonOrThrow<CreateThoughtResponse>(response);
}

export async function deleteThoughtById(thoughtId: string): Promise<void> {
  await readJsonOrThrow(await fetch(`/api/thoughts/${encodeURIComponent(thoughtId)}`, { method: 'DELETE' }));
}
