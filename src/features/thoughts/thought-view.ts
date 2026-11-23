import type { Thought } from './thought-types';

export const THOUGHTS_PAGE_PATH = '/thoughts/';

export function thoughtSearchableText(thought: Thought): string {
  return [thought.body, ...thought.tags].join('\n');
}

export function thoughtAnchorId(thoughtId: string): string {
  return `thought-${thoughtId}`;
}
