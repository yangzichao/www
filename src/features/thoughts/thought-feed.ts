import { formatExactTimestamp, formatThoughtTimestamp } from './thought-date-format';
import { renderThoughtMarkdown } from './thought-markdown';
import type { Thought } from './thought-types';

export interface ThoughtFeedItem {
  id: string;
  body: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  displayTimestamp: string;
  updatedAt: string | null;
  displayEditedTimestamp: string | null;
  html: string;
}

export function toThoughtFeedItem(thought: Thought): ThoughtFeedItem {
  return {
    id: thought.id,
    body: thought.body,
    tags: thought.tags,
    isPublic: thought.isPublic,
    createdAt: thought.createdAt,
    displayTimestamp: formatThoughtTimestamp(thought),
    updatedAt: thought.updatedAt,
    displayEditedTimestamp: thought.updatedAt ? formatExactTimestamp(thought.updatedAt) : null,
    html: renderThoughtMarkdown(thought.body),
  };
}

function pluralizeThoughts(thoughtCount: number): string {
  return `${thoughtCount} ${thoughtCount === 1 ? 'thought' : 'thoughts'}`;
}

export function describeThoughtCount(shownCount: number, totalCount: number): string {
  if (totalCount === 0) return 'No thoughts yet';
  if (shownCount === totalCount) return pluralizeThoughts(totalCount);
  return `${shownCount} of ${pluralizeThoughts(totalCount)}`;
}
