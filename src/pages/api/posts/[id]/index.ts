import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rejectUnlessSameOriginAdmin } from '../../../../features/auth/require-same-origin-admin';
import { jsonError, jsonNoStore } from '../../../../features/http/json-responses';
import { respondToPostWrite } from '../../../../features/posts/post-write-response';
import { deletePost, updatePost } from '../../../../features/posts/store/post-store';

export const prerender = false;

export const PATCH: APIRoute = async (context) => {
  const rejection = await rejectUnlessSameOriginAdmin(context);
  if (rejection) return rejection;
  const postId = context.params.id ?? '';
  return respondToPostWrite(context.request, (submission) => updatePost(env.DB, postId, submission), 200);
};

export const DELETE: APIRoute = async (context) => {
  const rejection = await rejectUnlessSameOriginAdmin(context);
  if (rejection) return rejection;
  const deleted = await deletePost(env.DB, context.params.id ?? '');
  return deleted ? jsonNoStore({ deleted: true }) : jsonError(404, 'Post not found.');
};
