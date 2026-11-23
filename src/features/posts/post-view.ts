import type { PostSummary } from './post-types';

export function postSearchableText(post: PostSummary): string {
  return [post.title, post.description ?? '', post.path, ...post.tags].join('\n');
}

export function editPostUrl(postId: string): string {
  return `/admin/posts/${encodeURIComponent(postId)}/`;
}

export const NEW_POST_URL = '/admin/posts/new/';
