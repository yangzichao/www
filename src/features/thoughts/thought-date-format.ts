import { formatSiteTimestamp } from '../dates/site-timestamp-format';
import type { Thought } from './thought-types';

const monthTimestampFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatThoughtTimestamp(thought: Pick<Thought, 'createdAt' | 'timestampPrecision'>): string {
  if (thought.timestampPrecision === 'month') return monthTimestampFormat.format(new Date(thought.createdAt));
  return formatSiteTimestamp(thought.createdAt);
}
