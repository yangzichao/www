export const CONTENT_SORT_ORDERS = ['newest', 'oldest', 'recently-edited'] as const;
export type ContentSortOrder = (typeof CONTENT_SORT_ORDERS)[number];

export const CONTENT_VISIBILITY_FILTERS = ['all', 'public', 'private'] as const;
export type ContentVisibilityFilter = (typeof CONTENT_VISIBILITY_FILTERS)[number];

export interface ContentViewQuery {
  sort: ContentSortOrder;
  category: string | null;
  tag: string | null;
  visibility: ContentVisibilityFilter;
  search: string;
}

export interface ContentViewQueryOptions {
  viewerIsAdmin: boolean;
  allowedCategories: readonly string[];
}

export const DEFAULT_CONTENT_VIEW_QUERY: ContentViewQuery = {
  sort: 'newest',
  category: null,
  tag: null,
  visibility: 'all',
  search: '',
};

function pickAllowed<T extends string>(allowed: readonly T[], rawValue: string | null, fallback: T): T {
  return allowed.find((candidate) => candidate === rawValue) ?? fallback;
}

export function parseContentViewQuery(
  searchParams: URLSearchParams,
  { viewerIsAdmin, allowedCategories }: ContentViewQueryOptions,
): ContentViewQuery {
  const rawTag = searchParams.get('tag')?.trim() ?? '';
  return {
    sort: pickAllowed(CONTENT_SORT_ORDERS, searchParams.get('sort'), DEFAULT_CONTENT_VIEW_QUERY.sort),
    category: allowedCategories.find((category) => category === searchParams.get('category')) ?? null,
    tag: rawTag.length > 0 ? rawTag : null,
    visibility: viewerIsAdmin
      ? pickAllowed(CONTENT_VISIBILITY_FILTERS, searchParams.get('visibility'), DEFAULT_CONTENT_VIEW_QUERY.visibility)
      : DEFAULT_CONTENT_VIEW_QUERY.visibility,
    search: searchParams.get('q')?.trim() ?? '',
  };
}

export function isFilteredContentView(query: ContentViewQuery): boolean {
  return query.category !== null || query.tag !== null || query.visibility !== 'all' || query.search.length > 0;
}

function contentViewSearchParams(query: ContentViewQuery): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (query.sort !== DEFAULT_CONTENT_VIEW_QUERY.sort) searchParams.set('sort', query.sort);
  if (query.category !== null) searchParams.set('category', query.category);
  if (query.tag !== null) searchParams.set('tag', query.tag);
  if (query.visibility !== DEFAULT_CONTENT_VIEW_QUERY.visibility) searchParams.set('visibility', query.visibility);
  if (query.search.length > 0) searchParams.set('q', query.search);
  return searchParams;
}

export function buildContentViewHref(
  basePath: string,
  query: ContentViewQuery,
  changes: Partial<ContentViewQuery> = {},
): string {
  const queryString = contentViewSearchParams({ ...query, ...changes }).toString();
  return queryString.length > 0 ? `${basePath}?${queryString}` : basePath;
}
