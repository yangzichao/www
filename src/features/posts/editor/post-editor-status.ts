import { formatSiteTimestamp } from '../../dates/site-timestamp-format';
import type { EditablePost } from './post-draft';

export function describeSavedPost(post: EditablePost | null): string {
  if (!post) return 'New post, not saved yet';
  const created = `Created ${formatSiteTimestamp(post.createdAt)}`;
  return post.updatedAt ? `${created} · Edited ${formatSiteTimestamp(post.updatedAt)}` : created;
}
