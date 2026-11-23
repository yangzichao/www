import { MAX_POST_HEADING_COUNT } from '../post-limits';
import type { PostHeading } from '../rendering/post-heading';

function isPostHeading(value: unknown): value is PostHeading {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.depth === 'number' &&
    Number.isInteger(candidate.depth) &&
    candidate.depth >= 1 &&
    candidate.depth <= 6 &&
    typeof candidate.slug === 'string' &&
    typeof candidate.text === 'string'
  );
}

export function parsePostHeadings(value: unknown): PostHeading[] | null {
  if (!Array.isArray(value) || value.length > MAX_POST_HEADING_COUNT) return null;
  if (!value.every(isPostHeading)) return null;
  return value.map(({ depth, slug, text }) => ({ depth, slug, text }));
}
