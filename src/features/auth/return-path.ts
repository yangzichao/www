const DEFAULT_RETURN_PATH = '/';
const SAME_SITE_PROBE_ORIGIN = 'https://return-path.invalid';

export function sanitizeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith('/')) return DEFAULT_RETURN_PATH;
  const resolved = new URL(value, SAME_SITE_PROBE_ORIGIN);
  if (resolved.origin !== SAME_SITE_PROBE_ORIGIN) return DEFAULT_RETURN_PATH;
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
