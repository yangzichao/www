import type { ContentSortOrder, ContentViewQuery, ContentVisibilityFilter } from './content-view-query';

export interface ViewableContent {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  tags: string[];
  isPublic: boolean;
}

function matchesVisibility(item: ViewableContent, visibility: ContentVisibilityFilter): boolean {
  if (visibility === 'public') return item.isPublic;
  if (visibility === 'private') return !item.isPublic;
  return true;
}

function lastTouchedAt(item: ViewableContent): string {
  return item.updatedAt ?? item.createdAt;
}

function compareDescending(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? 1 : -1;
}

function compareForSortOrder(sort: ContentSortOrder): (left: ViewableContent, right: ViewableContent) => number {
  if (sort === 'oldest') {
    return (left, right) => compareDescending(right.createdAt, left.createdAt) || compareDescending(right.id, left.id);
  }
  if (sort === 'recently-edited') {
    return (left, right) =>
      compareDescending(lastTouchedAt(left), lastTouchedAt(right)) || compareDescending(left.id, right.id);
  }
  return (left, right) => compareDescending(left.createdAt, right.createdAt) || compareDescending(left.id, right.id);
}

export function selectContentForView<T extends ViewableContent>(
  items: readonly T[],
  query: ContentViewQuery,
  searchableTextOf: (item: T) => string,
): T[] {
  const normalizedSearch = query.search.toLocaleLowerCase();
  return items
    .filter((item) => matchesVisibility(item, query.visibility))
    .filter((item) => query.tag === null || item.tags.includes(query.tag))
    .filter((item) => searchableTextOf(item).toLocaleLowerCase().includes(normalizedSearch))
    .toSorted(compareForSortOrder(query.sort));
}

export interface TagCount {
  tag: string;
  count: number;
}

export function countTags(items: readonly ViewableContent[]): TagCount[] {
  const countsByTag = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) countsByTag.set(tag, (countsByTag.get(tag) ?? 0) + 1);
  }
  return [...countsByTag]
    .map(([tag, count]) => ({ tag, count }))
    .toSorted((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
}
