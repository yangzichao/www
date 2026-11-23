import { env } from 'cloudflare:workers';
import { isPublicPostPath } from '../posts/store/post-store';
import type { PublishedPageSources } from './page-path';

export function sitePublishedPageSources(): PublishedPageSources {
  return { assets: env.ASSETS, isPublicPostPath: (postPath) => isPublicPostPath(env.DB, postPath) };
}
