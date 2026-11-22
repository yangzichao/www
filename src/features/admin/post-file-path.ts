import type { PostFileSummary } from './post-file-types';

const BLOG_CONTENT_DIRECTORY = 'src/content/blog/';

const POST_FILE_PATH_PATTERN = /^src\/content\/blog\/(?<category>[a-z0-9-]+)\/(?<slug>[a-z0-9-]+)\.md$/;

export function isEditablePostFilePath(path: string): boolean {
  return POST_FILE_PATH_PATTERN.test(path);
}

export function postFileSummaryFor(path: string): PostFileSummary | null {
  const groups = POST_FILE_PATH_PATTERN.exec(path)?.groups;
  const category = groups?.category;
  const slug = groups?.slug;
  if (category === undefined || slug === undefined) return null;
  return { path, category, slug };
}

export function postFilePathFor(category: string, slug: string): string {
  return `${BLOG_CONTENT_DIRECTORY}${category}/${slug}.md`;
}

export function publicUrlForPostFile(path: string): string {
  return `/blog/${path.slice(BLOG_CONTENT_DIRECTORY.length).replace(/\.md$/, '')}/`;
}
