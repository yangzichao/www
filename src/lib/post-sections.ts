export interface PostSection {
  collection: 'blog' | 'archive';
  basePath: string;
  label: string;
  isPublic: boolean;
}

export const WRITING_SECTION: PostSection = {
  collection: 'blog',
  basePath: '/blog/',
  label: 'Writing',
  isPublic: true,
};

export const ARCHIVE_SECTION: PostSection = {
  collection: 'archive',
  basePath: '/archive/blog/',
  label: 'Archive',
  isPublic: false,
};

export function postUrl(section: PostSection, postId: string): string {
  return `${section.basePath}${postId}/`;
}

export function categoryUrl(section: PostSection, categorySlug: string): string {
  return `${section.basePath}#${categorySlug}`;
}
