import { MAX_POST_TAG_COUNT, MAX_POST_TAG_LENGTH } from './post-limits';

function normalizePostTag(rawTag: string): string {
  return rawTag.trim().replace(/^#+/, '').trim().slice(0, MAX_POST_TAG_LENGTH);
}

export function normalizePostTags(rawTags: readonly string[]): string[] {
  const uniqueTags = new Set(rawTags.map(normalizePostTag).filter(Boolean));
  return [...uniqueTags].slice(0, MAX_POST_TAG_COUNT);
}

export function splitPostTagInput(tagInput: string): string[] {
  return normalizePostTags(tagInput.split(/[,，]+/));
}
