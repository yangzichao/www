import { MAX_POST_PATH_LENGTH } from './post-limits';

const POST_PATH_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export const BLOG_BASE_PATH = '/blog/';

export function isValidPostPath(path: string): boolean {
  return path.length <= MAX_POST_PATH_LENGTH && POST_PATH_PATTERN.test(path);
}

export function categoryOfPostPath(path: string): string {
  return path.slice(0, path.indexOf('/'));
}

export function postUrl(path: string): string {
  return `${BLOG_BASE_PATH}${path}/`;
}

export function postPathFromPagePath(pagePath: string): string | null {
  if (!pagePath.startsWith(BLOG_BASE_PATH) || !pagePath.endsWith('/')) return null;
  const path = pagePath.slice(BLOG_BASE_PATH.length, -1);
  return isValidPostPath(path) ? path : null;
}
