import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rejectUnlessAdmin } from '../../../features/auth/require-admin';
import { jsonError, jsonNoStore } from '../../../features/http/json-responses';
import { isSameOriginRequest } from '../../../features/http/same-origin';
import { parseThoughtSubmission } from '../../../features/thoughts/thought-input';
import { insertThought } from '../../../features/thoughts/thought-store';
import type { CreateThoughtResponse } from '../../../features/thoughts/thought-types';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, cookies }) => {
  if (!isSameOriginRequest(request, url)) return jsonError(403, 'Cross-origin request rejected.');
  const rejection = await rejectUnlessAdmin(cookies);
  if (rejection) return rejection;

  const submission = parseThoughtSubmission(await request.json().catch(() => null));
  if (typeof submission === 'string') return jsonError(400, submission);

  const created: CreateThoughtResponse = { thought: await insertThought(env.DB, submission) };
  return jsonNoStore(created, 201);
};
