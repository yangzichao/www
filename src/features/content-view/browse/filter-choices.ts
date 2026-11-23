import type { TagCount } from '../content-view-selection';
import type { ContentSortOrder, ContentVisibilityFilter } from '../content-view-query';

export interface CategoryChoice {
  category: string;
  label: string;
  count: number;
}

export const SORT_CHOICES: readonly { value: ContentSortOrder; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'recently-edited', label: 'Recently edited' },
];

export const VISIBILITY_CHOICES: readonly { value: ContentVisibilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

export const LEADING_TAG_LIMIT = 12;

export interface SplitTagCounts {
  leadingTags: TagCount[];
  overflowTags: TagCount[];
  selectedTagIsInOverflow: boolean;
}

export function splitTagCounts(tagCounts: readonly TagCount[], selectedTag: string | null): SplitTagCounts {
  const overflowTags = tagCounts.slice(LEADING_TAG_LIMIT);
  return {
    leadingTags: tagCounts.slice(0, LEADING_TAG_LIMIT),
    overflowTags,
    selectedTagIsInOverflow: overflowTags.some(({ tag }) => tag === selectedTag),
  };
}
