import { MAX_THOUGHT_TAG_COUNT, MAX_THOUGHT_TAG_LENGTH } from './thought-limits';

function normalizeTag(rawTag: string): string {
  return rawTag.trim().replace(/^#+/, '').trim().slice(0, MAX_THOUGHT_TAG_LENGTH);
}

export function normalizeTags(rawTags: readonly string[]): string[] {
  const uniqueTags = new Set(rawTags.map(normalizeTag).filter(Boolean));
  return [...uniqueTags].slice(0, MAX_THOUGHT_TAG_COUNT);
}

export function splitTagInput(tagInput: string): string[] {
  return normalizeTags(tagInput.split(/[,，\s]+/));
}
