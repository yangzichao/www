import { SITE_TIME_ZONE } from '../dates/site-timestamp-format';
import type { PostSummary } from './post-types';

export type PostDateStyle = 'short' | 'long';

function dateFormat(style: PostDateStyle, timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: style, day: 'numeric', timeZone });
}

export function formatPostCreatedDate(
  post: Pick<PostSummary, 'createdAt' | 'timestampPrecision'>,
  style: PostDateStyle,
): string {
  const timeZone = post.timestampPrecision === 'day' ? 'UTC' : SITE_TIME_ZONE;
  return dateFormat(style, timeZone).format(new Date(post.createdAt));
}

export function formatPostEditedDate(updatedAt: string, style: PostDateStyle): string {
  return dateFormat(style, SITE_TIME_ZONE).format(new Date(updatedAt));
}
