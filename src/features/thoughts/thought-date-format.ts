import type { Thought } from './thought-types';

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

export function formatExactTimestamp(isoTimestamp: string): string {
  return exactTimestampFormat.format(new Date(isoTimestamp));
}

export function formatThoughtTimestamp(thought: Pick<Thought, 'createdAt' | 'timestampPrecision'>): string {
  if (thought.timestampPrecision === 'month') return monthTimestampFormat.format(new Date(thought.createdAt));
  return formatExactTimestamp(thought.createdAt);
}
