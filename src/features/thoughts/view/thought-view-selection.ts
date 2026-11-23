import type { Thought } from '../thought-types';
import type { ThoughtSortOrder, ThoughtViewQuery, ThoughtVisibilityFilter } from './thought-view-query';

function matchesVisibility(thought: Thought, visibility: ThoughtVisibilityFilter): boolean {
  if (visibility === 'public') return thought.isPublic;
  if (visibility === 'private') return !thought.isPublic;
  return true;
}

function matchesSearch(thought: Thought, normalizedSearch: string): boolean {
  if (normalizedSearch.length === 0) return true;
  const searchableText = [thought.body, ...thought.tags].join('\n').toLocaleLowerCase();
  return searchableText.includes(normalizedSearch);
}

function lastTouchedAt(thought: Thought): string {
  return thought.updatedAt ?? thought.createdAt;
}

function compareDescending(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? 1 : -1;
}

function compareForSortOrder(sort: ThoughtSortOrder): (left: Thought, right: Thought) => number {
  if (sort === 'oldest') {
    return (left, right) => compareDescending(right.createdAt, left.createdAt) || compareDescending(right.id, left.id);
  }
  if (sort === 'recently-edited') {
    return (left, right) =>
      compareDescending(lastTouchedAt(left), lastTouchedAt(right)) || compareDescending(left.id, right.id);
  }
  return (left, right) => compareDescending(left.createdAt, right.createdAt) || compareDescending(left.id, right.id);
}

export function selectThoughtsForView(thoughts: readonly Thought[], query: ThoughtViewQuery): Thought[] {
  const normalizedSearch = query.search.toLocaleLowerCase();
  return thoughts
    .filter((thought) => matchesVisibility(thought, query.visibility))
    .filter((thought) => query.tag === null || thought.tags.includes(query.tag))
    .filter((thought) => matchesSearch(thought, normalizedSearch))
    .toSorted(compareForSortOrder(query.sort));
}

export interface ThoughtTagCount {
  tag: string;
  count: number;
}

export function countThoughtTags(thoughts: readonly Thought[]): ThoughtTagCount[] {
  const countsByTag = new Map<string, number>();
  for (const thought of thoughts) {
    for (const tag of thought.tags) countsByTag.set(tag, (countsByTag.get(tag) ?? 0) + 1);
  }
  return [...countsByTag]
    .map(([tag, count]) => ({ tag, count }))
    .toSorted((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
}
