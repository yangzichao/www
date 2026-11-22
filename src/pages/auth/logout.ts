import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { clearSessionCookie, readSessionToken } from '../../features/auth/session-cookie';
import { deleteSession } from '../../features/auth/session-store';
import { isSameOriginRequest } from '../../features/http/same-origin';
import { jsonError, jsonNoStore } from '../../features/http/json-responses';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, cookies }) => {
  if (!isSameOriginRequest(request, url)) return jsonError(403, 'Cross-origin request rejected.');
  const sessionToken = readSessionToken(cookies);
  if (sessionToken) await deleteSession(env.DB, sessionToken);
  clearSessionCookie(cookies);
  return jsonNoStore({ signedOut: true });
};
