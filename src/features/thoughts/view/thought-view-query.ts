export const THOUGHT_SORT_ORDERS = ['newest', 'oldest', 'recently-edited'] as const;
export type ThoughtSortOrder = (typeof THOUGHT_SORT_ORDERS)[number];

export const THOUGHT_VISIBILITY_FILTERS = ['all', 'public', 'private'] as const;
export type ThoughtVisibilityFilter = (typeof THOUGHT_VISIBILITY_FILTERS)[number];

export interface ThoughtViewQuery {
  sort: ThoughtSortOrder;
  tag: string | null;
  visibility: ThoughtVisibilityFilter;
  search: string;
}

export const DEFAULT_THOUGHT_VIEW_QUERY: ThoughtViewQuery = {
  sort: 'newest',
  tag: null,
  visibility: 'all',
  search: '',
};

const THOUGHTS_PAGE_PATH = '/thoughts/';

function pickAllowed<T extends string>(allowed: readonly T[], rawValue: string | null, fallback: T): T {
  return allowed.find((candidate) => candidate === rawValue) ?? fallback;
}

export function parseThoughtViewQuery(searchParams: URLSearchParams, viewerIsAdmin: boolean): ThoughtViewQuery {
  const rawTag = searchParams.get('tag')?.trim() ?? '';
  return {
    sort: pickAllowed(THOUGHT_SORT_ORDERS, searchParams.get('sort'), DEFAULT_THOUGHT_VIEW_QUERY.sort),
    tag: rawTag.length > 0 ? rawTag : null,
    visibility: viewerIsAdmin
      ? pickAllowed(THOUGHT_VISIBILITY_FILTERS, searchParams.get('visibility'), DEFAULT_THOUGHT_VIEW_QUERY.visibility)
      : DEFAULT_THOUGHT_VIEW_QUERY.visibility,
    search: searchParams.get('q')?.trim() ?? '',
  };
}

export function isFilteredThoughtView(query: ThoughtViewQuery): boolean {
  return query.tag !== null || query.visibility !== 'all' || query.search.length > 0;
}

export function thoughtViewSearchParams(query: ThoughtViewQuery): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (query.sort !== DEFAULT_THOUGHT_VIEW_QUERY.sort) searchParams.set('sort', query.sort);
  if (query.tag !== null) searchParams.set('tag', query.tag);
  if (query.visibility !== DEFAULT_THOUGHT_VIEW_QUERY.visibility) searchParams.set('visibility', query.visibility);
  if (query.search.length > 0) searchParams.set('q', query.search);
  return searchParams;
}

export function buildThoughtViewHref(query: ThoughtViewQuery, changes: Partial<ThoughtViewQuery> = {}): string {
  const queryString = thoughtViewSearchParams({ ...query, ...changes }).toString();
  return queryString.length > 0 ? `${THOUGHTS_PAGE_PATH}?${queryString}` : THOUGHTS_PAGE_PATH;
}
