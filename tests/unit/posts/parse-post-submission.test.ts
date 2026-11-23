import { describe, expect, it } from 'vitest';
import { parsePostSubmission } from '../../../src/features/posts/input/parse-post-submission';
import { buildPostSubmission } from '../../support/post-fixtures';

function submissionWith(changes: Record<string, unknown>): Record<string, unknown> {
  return { ...buildPostSubmission(), ...changes };
}

describe('parsePostSubmission', () => {
  it('trims text, turns blank optional fields into null, and normalizes tags', () => {
    const parsed = parsePostSubmission(
      submissionWith({
        path: ' testing/first-post ',
        title: '  First post ',
        description: '   ',
        venue: ' PRC ',
        tags: ['#ai', 'ai', 3, ' life '],
        headings: [{ depth: 2, slug: 'intro', text: 'Intro', extra: true }],
      }),
    );

    expect(parsed).toStrictEqual({
      ...buildPostSubmission(),
      description: null,
      venue: 'PRC',
      tags: ['ai', 'life'],
    });
  });

  it('treats missing tags as no tags', () => {
    const parsed = parsePostSubmission(submissionWith({ tags: 'ai' }));

    expect(parsed).toMatchObject({ tags: [] });
  });

  it.each([
    [null, 'Request body must be a JSON object.'],
    ['text', 'Request body must be a JSON object.'],
    [submissionWith({ title: '  ' }), 'Title cannot be empty.'],
    [submissionWith({ title: 'x'.repeat(201) }), 'Title must be at most 200 characters.'],
    [
      submissionWith({ path: 'no-category' }),
      'Path must look like category/slug, using lowercase letters, digits, and dashes.',
    ],
    [submissionWith({ description: 'x'.repeat(601) }), 'Description must be at most 600 characters.'],
    [submissionWith({ venue: 'x'.repeat(201) }), 'Venue must be at most 200 characters.'],
    [submissionWith({ bodyMarkdown: ' \n ' }), 'Post body cannot be empty.'],
    [submissionWith({ bodyMarkdown: 7 }), 'Post body cannot be empty.'],
    [submissionWith({ bodyMarkdown: 'x'.repeat(200_001) }), 'Post body must be at most 200000 characters.'],
    [submissionWith({ bodyHtml: undefined }), 'Rendered HTML is missing or too large.'],
    [submissionWith({ bodyHtml: 'x'.repeat(1_800_001) }), 'Rendered HTML is missing or too large.'],
    [submissionWith({ headings: 'none' }), 'Headings must be a list of { depth, slug, text }.'],
    [submissionWith({ headings: [null] }), 'Headings must be a list of { depth, slug, text }.'],
    [
      submissionWith({ headings: [{ depth: 7, slug: 'a', text: 'A' }] }),
      'Headings must be a list of { depth, slug, text }.',
    ],
    [
      submissionWith({ headings: [{ depth: 1.5, slug: 'a', text: 'A' }] }),
      'Headings must be a list of { depth, slug, text }.',
    ],
    [
      submissionWith({ headings: [{ depth: 2, slug: 1, text: 'A' }] }),
      'Headings must be a list of { depth, slug, text }.',
    ],
    [
      submissionWith({ headings: Array.from({ length: 501 }, () => ({ depth: 2, slug: 'a', text: 'A' })) }),
      'Headings must be a list of { depth, slug, text }.',
    ],
    [submissionWith({ isPublic: 'yes' }), 'isPublic must be true or false.'],
  ])('rejects %#: %s', (payload, expectedProblem) => {
    expect(parsePostSubmission(payload)).toBe(expectedProblem);
  });
});
