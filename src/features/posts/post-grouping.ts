import { categoryLabel, categoryRank } from './post-categories';
import { categoryOfPostPath } from './post-path';
import type { PostSummary } from './post-types';

export interface CategoryGroup {
  category: string;
  label: string;
  posts: PostSummary[];
}

export function groupByCategory(posts: readonly PostSummary[]): CategoryGroup[] {
  const postsByCategory = new Map<string, PostSummary[]>();
  for (const post of posts) {
    const category = categoryOfPostPath(post.path);
    postsByCategory.set(category, [...(postsByCategory.get(category) ?? []), post]);
  }
  return [...postsByCategory]
    .map(([category, groupPosts]) => ({ category, label: categoryLabel(category), posts: groupPosts }))
    .toSorted(
      (left, right) =>
        categoryRank(left.category) - categoryRank(right.category) || left.category.localeCompare(right.category),
    );
}

export interface AdjacentPosts {
  newer: PostSummary | null;
  older: PostSummary | null;
}

export function adjacentPostsInCategory(newestFirstPosts: readonly PostSummary[], currentPath: string): AdjacentPosts {
  const category = categoryOfPostPath(currentPath);
  const categoryPosts = newestFirstPosts.filter((post) => categoryOfPostPath(post.path) === category);
  const index = categoryPosts.findIndex((post) => post.path === currentPath);
  if (index === -1) return { newer: null, older: null };
  return { newer: categoryPosts[index - 1] ?? null, older: categoryPosts[index + 1] ?? null };
}
