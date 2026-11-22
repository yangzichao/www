import { formatThoughtTimestamp } from './thought-date-format';
import { renderThoughtMarkdown } from './thought-markdown';
import type { PublicThought } from './thought-types';

export interface ThoughtFeedItem {
  id: string;
  tags: string[];
  createdAt: string;
  displayTimestamp: string;
  html: string;
}

export function toThoughtFeedItem(thought: PublicThought): ThoughtFeedItem {
  return {
    id: thought.id,
    tags: thought.tags,
    createdAt: thought.createdAt,
    displayTimestamp: formatThoughtTimestamp(thought),
    html: renderThoughtMarkdown(thought.body),
  };
}

export function describeThoughtCount(thoughtCount: number): string {
  if (thoughtCount === 0) return 'No thoughts yet';
  return `${thoughtCount} ${thoughtCount === 1 ? 'thought' : 'thoughts'}`;
}
