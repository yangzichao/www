import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export type CategoryGroup = {
  slug: string;
  label: string;
  posts: Post[];
};

const UNCATEGORIZED = 'misc';

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI',
  growth: 'Growth',
  'system-design': 'System Design',
  physics: 'Physics',
  life: 'Life',
  meta: 'Meta',
  [UNCATEGORIZED]: 'Miscellaneous',
};

const CATEGORY_ORDER: string[] = ['system-design', 'ai', 'growth', 'physics', 'life', 'meta', UNCATEGORIZED];

function categoryRank(slug: string): number {
  const index = CATEGORY_ORDER.indexOf(slug);
  if (index !== -1) return index;
  return CATEGORY_ORDER.indexOf(UNCATEGORIZED);
}

export function categoryOfId(id: string): string {
  return id.includes('/') ? id.split('/')[0] : UNCATEGORIZED;
}

function categoryOf(post: Post): string {
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

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

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
  newer: Post | null;
  older: Post | null;
};

export function getAdjacentPostsInCategory(posts: Post[], currentId: string): AdjacentPosts {
  const currentCategory = categoryOfId(currentId);
  const categoryPosts = posts.filter((post) => categoryOf(post) === currentCategory);
  const index = categoryPosts.findIndex((post) => post.id === currentId);
  if (index === -1) return { newer: null, older: null };
  return {
    newer: index > 0 ? categoryPosts[index - 1] : null,
    older: index < categoryPosts.length - 1 ? categoryPosts[index + 1] : null,
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
