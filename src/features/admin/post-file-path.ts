export const BLOG_CONTENT_DIRECTORY = 'src/content/blog/';

const POST_FILE_PATH_PATTERN = /^src\/content\/blog\/[a-z0-9-]+\/[a-z0-9-]+\.md$/;

export function isEditablePostFilePath(path: string): boolean {
  return POST_FILE_PATH_PATTERN.test(path);
}

export function postFilePathFor(category: string, slug: string): string {
  return `${BLOG_CONTENT_DIRECTORY}${category}/${slug}.md`;
}

export function publicUrlForPostFile(path: string): string {
  return `/blog/${path.slice(BLOG_CONTENT_DIRECTORY.length).replace(/\.md$/, '')}/`;
}
