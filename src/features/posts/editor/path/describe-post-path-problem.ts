import { isValidPostPath } from '../../post-path';
import { splitPostPath } from './post-path-parts';

export function describePostPathProblem(path: string): string | null {
  if (isValidPostPath(path)) return null;
  const { category, slug } = splitPostPath(path);
  if (category === '') return 'Pick a category before saving.';
  if (slug === '') return 'Add a URL slug before saving.';
  return 'Category and slug can only use lowercase letters, numbers, and single dashes.';
}
