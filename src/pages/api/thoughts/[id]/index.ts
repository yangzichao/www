import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rejectUnlessSameOriginAdmin } from '../../../../features/auth/require-same-origin-admin';
import { jsonError, jsonNoStore } from '../../../../features/http/json-responses';
import { parseThoughtSubmission } from '../../../../features/thoughts/thought-input';
import { deleteThought, updateThought } from '../../../../features/thoughts/thought-store';
import type { ThoughtResponse } from '../../../../features/thoughts/thought-types';

export const prerender = false;

export const PATCH: APIRoute = async (context) => {
  const rejection = await rejectUnlessSameOriginAdmin(context);
  if (rejection) return rejection;

  const submission = parseThoughtSubmission(await context.request.json().catch(() => null));
  if (typeof submission === 'string') return jsonError(400, submission);

  const updated = await updateThought(env.DB, context.params.id ?? '', submission);
  if (!updated) return jsonError(404, 'Thought not found.');
  const response: ThoughtResponse = { thought: updated };
  return jsonNoStore(response);
};

export const DELETE: APIRoute = async (context) => {
  const rejection = await rejectUnlessSameOriginAdmin(context);
  if (rejection) return rejection;
  const deleted = await deleteThought(env.DB, context.params.id ?? '');
  return deleted ? jsonNoStore({ deleted: true }) : jsonError(404, 'Thought not found.');
};
