import {
  MAX_POST_DESCRIPTION_LENGTH,
  MAX_POST_HTML_LENGTH,
  MAX_POST_MARKDOWN_LENGTH,
  MAX_POST_TITLE_LENGTH,
  MAX_POST_VENUE_LENGTH,
} from '../post-limits';
import { isValidPostPath } from '../post-path';
import { normalizePostTags } from '../post-tags';
import type { PostSubmission } from '../post-types';
import { parsePostHeadings } from './parse-post-headings';
import { readOptionalText, readStringList, readTrimmedString, type FieldReader } from './read-fields';

type PostTextFields = Pick<PostSubmission, 'path' | 'title' | 'description' | 'venue' | 'bodyMarkdown'>;

function readTextFields(fields: FieldReader): PostTextFields {
  return {
    path: readTrimmedString(fields, 'path'),
    title: readTrimmedString(fields, 'title'),
    description: readOptionalText(fields, 'description'),
    venue: readOptionalText(fields, 'venue'),
    bodyMarkdown: typeof fields.bodyMarkdown === 'string' ? fields.bodyMarkdown : '',
  };
}

function isLongerThan(text: string | null, maximumLength: number): boolean {
  return text !== null && text.length > maximumLength;
}

function findTextFieldProblem(text: PostTextFields): string | null {
  if (text.title.length === 0) return 'Title cannot be empty.';
  if (isLongerThan(text.title, MAX_POST_TITLE_LENGTH))
    return `Title must be at most ${MAX_POST_TITLE_LENGTH} characters.`;
  if (!isValidPostPath(text.path))
    return 'Path must look like category/slug, using lowercase letters, digits, and dashes.';
  if (isLongerThan(text.description, MAX_POST_DESCRIPTION_LENGTH))
    return `Description must be at most ${MAX_POST_DESCRIPTION_LENGTH} characters.`;
  if (isLongerThan(text.venue, MAX_POST_VENUE_LENGTH))
    return `Venue must be at most ${MAX_POST_VENUE_LENGTH} characters.`;
  if (text.bodyMarkdown.trim().length === 0) return 'Post body cannot be empty.';
  if (isLongerThan(text.bodyMarkdown, MAX_POST_MARKDOWN_LENGTH))
    return `Post body must be at most ${MAX_POST_MARKDOWN_LENGTH} characters.`;
  return null;
}

export function parsePostSubmission(payload: unknown): PostSubmission | string {
  if (typeof payload !== 'object' || payload === null) return 'Request body must be a JSON object.';
  const fields = payload as FieldReader;
  const text = readTextFields(fields);
  const textProblem = findTextFieldProblem(text);
  if (textProblem) return textProblem;
  const { bodyHtml, isPublic } = fields;
  if (typeof bodyHtml !== 'string' || bodyHtml.length > MAX_POST_HTML_LENGTH)
    return 'Rendered HTML is missing or too large.';
  const headings = parsePostHeadings(fields.headings);
  if (headings === null) return 'Headings must be a list of { depth, slug, text }.';
  if (typeof isPublic !== 'boolean') return 'isPublic must be true or false.';
  return { ...text, tags: normalizePostTags(readStringList(fields.tags)), bodyHtml, headings, isPublic };
}
