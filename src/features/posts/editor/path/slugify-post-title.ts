const MAX_SLUG_LENGTH = 80;
const COMBINING_MARKS = /\p{M}/gu;
const NON_SLUG_RUNS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

export function slugifyPostTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_SLUG_RUNS, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(EDGE_DASHES, '');
}
