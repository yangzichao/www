export interface PostPathParts {
  category: string;
  slug: string;
}

export function splitPostPath(path: string): PostPathParts {
  const separatorIndex = path.indexOf('/');
  if (separatorIndex === -1) return { category: path, slug: '' };
  return { category: path.slice(0, separatorIndex), slug: path.slice(separatorIndex + 1) };
}

export function joinPostPath({ category, slug }: PostPathParts): string {
  if (category === '' && slug === '') return '';
  return `${category}/${slug}`;
}
