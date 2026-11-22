import type { AstroCookies } from 'astro';
import { loadCurrentUser } from '../auth/current-session';
import { adminSignInUrl } from '../auth/admin-sign-in-url';
import type { SessionUser } from '../auth/session-user';

export type AdminPageAccess = { kind: 'granted'; user: SessionUser } | { kind: 'redirect'; location: string };

export async function checkAdminPageAccess(
  cookies: AstroCookies,
  currentPath: string,
  options: { requiresRepositoryAccess: boolean },
): Promise<AdminPageAccess> {
  const user = await loadCurrentUser(cookies);
  const hasAccess = user?.isAdmin && (!options.requiresRepositoryAccess || user.hasRepositoryAccess);
  if (!user || !hasAccess) return { kind: 'redirect', location: adminSignInUrl(currentPath) };
  return { kind: 'granted', user };
}
