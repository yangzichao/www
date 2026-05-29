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
  'system-design': 'System Design',
  physics: 'Physics',
  life: 'Life',
  meta: 'Meta',
  [UNCATEGORIZED]: 'Miscellaneous',
};

export function categoryOf(post: Post): string {
  return post.id.includes('/') ? post.id.split('/')[0] : UNCATEGORIZED;
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
 * Group already-sorted posts by category. Categories are ordered by
 * their most recent post (freshest topic first); the catch-all bucket
 * always sorts last.
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
    .sort((a, b) => {
      if (a.slug === UNCATEGORIZED) return 1;
      if (b.slug === UNCATEGORIZED) return -1;
      return b.posts[0].data.date.getTime() - a.posts[0].data.date.getTime();
    });
}

export function formatPostDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
