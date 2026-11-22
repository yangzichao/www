import type { AstroCookies } from 'astro';
import { jsonError } from '../http/json-responses';
import { loadCurrentUser } from './current-session';

export async function rejectUnlessAdmin(cookies: AstroCookies): Promise<Response | null> {
  const user = await loadCurrentUser(cookies);
  if (!user) return jsonError(401, 'Sign in required.');
  if (!user.isAdmin) return jsonError(403, 'Admin only.');
  return null;
}
