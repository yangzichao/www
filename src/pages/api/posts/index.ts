import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rejectUnlessSameOriginAdmin } from '../../../features/auth/require-same-origin-admin';
import { respondToPostWrite } from '../../../features/posts/post-write-response';
import { insertPost } from '../../../features/posts/store/post-store';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const rejection = await rejectUnlessSameOriginAdmin(context);
  if (rejection) return rejection;
  return respondToPostWrite(context.request, (submission) => insertPost(env.DB, submission), 201);
};
