import { isFilteredContentView, type ContentViewQuery } from '../../content-view/content-view-query';
import type { CategoryChoice } from '../../content-view/browse/filter-choices';
import { groupByCategory } from '../post-grouping';
import { categoryOfPostPath } from '../post-path';
import type { PostSummary } from '../post-types';

export function listCategoryChoices(posts: readonly PostSummary[]): CategoryChoice[] {
  return groupByCategory(posts).map((group) => ({
    category: group.category,
    label: group.label,
    count: group.posts.length,
  }));
}

export function filterPostsByCategory(posts: readonly PostSummary[], category: string | null): PostSummary[] {
  if (category === null) return [...posts];
  return posts.filter((post) => categoryOfPostPath(post.path) === category);
}

export interface PostIndexSections {
  featuredPost: PostSummary | null;
  gridPosts: PostSummary[];
}

export function splitFeaturedPost(shownPosts: readonly PostSummary[], query: ContentViewQuery): PostIndexSections {
  const [firstPost, ...otherPosts] = shownPosts;
  const featuresNewestPost = query.sort === 'newest' && !isFilteredContentView(query);
  if (!featuresNewestPost || firstPost === undefined) return { featuredPost: null, gridPosts: [...shownPosts] };
  return { featuredPost: firstPost, gridPosts: otherPosts };
}
