import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rejectUnlessAdmin } from '../../../features/auth/require-admin';
import { listPendingComments, listRecentPublishedComments } from '../../../features/comments/comment-store';
import { jsonNoStore } from '../../../features/http/json-responses';

export const prerender = false;

const RECENT_COMMENT_LIMIT = 50;

export const GET: APIRoute = async ({ cookies }) => {
  const rejection = await rejectUnlessAdmin(cookies);
  if (rejection) return rejection;
  const [pending, recent] = await Promise.all([
    listPendingComments(env.DB),
    listRecentPublishedComments(env.DB, RECENT_COMMENT_LIMIT),
  ]);
  return jsonNoStore({ pending, recent });
};
