import { MAX_THOUGHT_BODY_LENGTH } from './thought-limits';
import { normalizeTags } from './thought-tags';

export interface ThoughtSubmission {
  body: string;
  tags: string[];
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function parseThoughtSubmission(payload: unknown): ThoughtSubmission | string {
  if (typeof payload !== 'object' || payload === null) return 'Request body must be a JSON object.';
  const fields = payload as Record<string, unknown>;
  const body = typeof fields.body === 'string' ? fields.body.trim() : '';
  if (body.length === 0) return 'Thought cannot be empty.';
  if (body.length > MAX_THOUGHT_BODY_LENGTH) return `Thought must be at most ${MAX_THOUGHT_BODY_LENGTH} characters.`;
  return { body, tags: normalizeTags(readStringList(fields.tags)) };
}
