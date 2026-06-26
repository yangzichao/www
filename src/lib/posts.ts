import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export type CategoryGroup = {
  slug: string;
  label: string;
  posts: Post[];
};

/**
 * Posts have no explicit category field — the topic is the first path
 * segment of the content id (e.g. `system-design/leetcode-online-judge`
 * → `system-design`). Root-level posts (e.g. `hello-world`) fall into
 * the catch-all bucket below.
 */
const UNCATEGORIZED = 'misc';

/** Pretty labels for known folders; everything else is title-cased. */
const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI',
  growth: 'Growth',
  'system-design': 'System Design',
  physics: 'Physics',
  life: 'Life',
  meta: 'Meta',
  [UNCATEGORIZED]: 'Miscellaneous',
};

/**
 * Explicit sidebar order. Categories keep a stable position instead of
 * reshuffling whenever a newer post lands in a different folder; the
 * catch-all bucket stays last, and unknown folders slot in just above it.
 */
const CATEGORY_ORDER: string[] = ['system-design', 'ai', 'growth', 'physics', 'life', 'meta', UNCATEGORIZED];

function categoryRank(slug: string): number {
  const index = CATEGORY_ORDER.indexOf(slug);
  if (index !== -1) return index;
  return CATEGORY_ORDER.indexOf(UNCATEGORIZED);
}

export function categoryOfId(id: string): string {
  return id.includes('/') ? id.split('/')[0] : UNCATEGORIZED;
}

export function categoryOf(post: Post): string {
  return categoryOfId(post.id);
}

export function categoryLabel(slug: string): string {
  return (
    CATEGORY_LABELS[slug] ??
    slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

/** Published (non-draft) posts, newest first. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * Group already-sorted posts by category, in the fixed CATEGORY_ORDER
 * so the sidebar layout stays stable as new posts land.
 */
export function groupByCategory(posts: Post[]): CategoryGroup[] {
  const buckets = new Map<string, Post[]>();
  for (const post of posts) {
    const slug = categoryOf(post);
    const existing = buckets.get(slug);
    if (existing) existing.push(post);
    else buckets.set(slug, [post]);
  }

  return [...buckets.entries()]
    .map(([slug, groupPosts]) => ({ slug, label: categoryLabel(slug), posts: groupPosts }))
    .sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug) || a.slug.localeCompare(b.slug));
}

export type AdjacentPosts = {
  previous: Post | null;
  next: Post | null;
};

/**
 * Neighbours of a post within its own category, following the sidebar's
 * newest-first order: `previous` is the next-newer post, `next` the
 * next-older one — so "Next" walks deeper into the archive.
 */
export function getAdjacentPostsInCategory(posts: Post[], currentId: string): AdjacentPosts {
  const currentCategory = categoryOfId(currentId);
  const categoryPosts = posts.filter((post) => categoryOf(post) === currentCategory);
  const index = categoryPosts.findIndex((post) => post.id === currentId);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? categoryPosts[index - 1] : null,
    next: index < categoryPosts.length - 1 ? categoryPosts[index + 1] : null,
  };
}

export function formatPostDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
