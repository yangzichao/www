import type { APIContext } from 'astro';
import { jsonError } from '../http/json-responses';
import { isSameOriginRequest } from '../http/same-origin';
import { rejectUnlessAdmin } from './require-admin';

export async function rejectUnlessSameOriginAdmin({
  request,
  url,
  cookies,
}: Pick<APIContext, 'request' | 'url' | 'cookies'>): Promise<Response | null> {
  if (!isSameOriginRequest(request, url)) return jsonError(403, 'Cross-origin request rejected.');
  return rejectUnlessAdmin(cookies);
}
