import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rejectUnlessAdmin } from '../../../../features/auth/require-admin';
import { jsonError, jsonNoStore } from '../../../../features/http/json-responses';
import { isSameOriginRequest } from '../../../../features/http/same-origin';
import { deleteThought } from '../../../../features/thoughts/thought-store';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, url, cookies, params }) => {
  if (!isSameOriginRequest(request, url)) return jsonError(403, 'Cross-origin request rejected.');
  const rejection = await rejectUnlessAdmin(cookies);
  if (rejection) return rejection;
  const deleted = await deleteThought(env.DB, params.id ?? '');
  return deleted ? jsonNoStore({ deleted: true }) : jsonError(404, 'Thought not found.');
};
