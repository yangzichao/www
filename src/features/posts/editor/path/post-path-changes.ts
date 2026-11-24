import { joinPostPath, splitPostPath } from './post-path-parts';
import { slugifyPostTitle } from './slugify-post-title';

export function pathWithCategory(path: string, category: string): string {
  return joinPostPath({ ...splitPostPath(path), category });
}

export function pathWithSlug(path: string, slug: string): string {
  return joinPostPath({ ...splitPostPath(path), slug });
}

export function pathFollowingTitle(path: string, title: string): string {
  return pathWithSlug(path, slugifyPostTitle(title));
}
