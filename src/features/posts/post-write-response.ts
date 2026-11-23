import { jsonError, jsonNoStore } from '../http/json-responses';
import { parsePostSubmission } from './input/parse-post-submission';
import type { Post, PostResponse, PostSubmission } from './post-types';
import { PostPathTakenError } from './store/post-store';

export async function respondToPostWrite(
  request: Request,
  write: (submission: PostSubmission) => Promise<Post | null>,
  successStatus: number,
): Promise<Response> {
  const submission = parsePostSubmission(await request.json().catch(() => null));
  if (typeof submission === 'string') return jsonError(400, submission);
  try {
    const post = await write(submission);
    if (!post) return jsonError(404, 'Post not found.');
    const response: PostResponse = { post };
    return jsonNoStore(response, successStatus);
  } catch (error) {
    if (error instanceof PostPathTakenError) return jsonError(409, error.message);
    throw error;
  }
}
