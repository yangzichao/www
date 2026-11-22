import type { PublicThought } from './thought-types';

const SITE_TIME_ZONE = 'America/New_York';

const exactTimestampFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: SITE_TIME_ZONE,
});

const monthTimestampFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatThoughtTimestamp(thought: Pick<PublicThought, 'createdAt' | 'timestampPrecision'>): string {
  const format = thought.timestampPrecision === 'month' ? monthTimestampFormat : exactTimestampFormat;
  return format.format(new Date(thought.createdAt));
}
