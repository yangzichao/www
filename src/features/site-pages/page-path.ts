const MAX_PAGE_PATH_LENGTH = 300;
const PAGE_PATH_PATTERN = /^\/[\w\-./%]*$/;

export function parsePagePath(rawPath: string): string | null {
  const path = rawPath.trim();
  if (path.length === 0 || path.length > MAX_PAGE_PATH_LENGTH) return null;
  if (!PAGE_PATH_PATTERN.test(path) || path.includes('..')) return null;
  return path;
}

export async function isPublishedPage(assets: Fetcher, path: string, siteOrigin: string): Promise<boolean> {
  const response = await assets.fetch(new URL(path, siteOrigin), { method: 'HEAD', redirect: 'manual' });
  return response.status === 200;
}
