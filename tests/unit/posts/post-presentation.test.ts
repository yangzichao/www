import { describe, expect, it } from 'vitest';
import { describePostCount } from '../../../src/features/posts/post-count';
import { formatPostCreatedDate, formatPostEditedDate } from '../../../src/features/posts/post-date-format';
import { buildPostExportFile } from '../../../src/features/posts/post-export';
import { editPostUrl, NEW_POST_URL, postSearchableText } from '../../../src/features/posts/post-view';
import { buildPost, buildPostSummary } from '../../support/post-fixtures';

describe('describePostCount', () => {
  it.each([
    [0, 0, 'No posts yet'],
    [1, 1, '1 post'],
    [5, 5, '5 posts'],
    [2, 9, '2 of 9 posts'],
    [0, 1, '0 of 1 post'],
  ])('describes %i shown of %i as %j', (shown, total, expected) => {
    expect(describePostCount(shown, total)).toBe(expected);
  });
});

describe('post dates', () => {
  it('shows day-precision dates as the stored calendar day', () => {
    const imported = { createdAt: '2024-03-01T00:00:00.000Z', timestampPrecision: 'day' as const };

    expect(formatPostCreatedDate(imported, 'short')).toBe('Mar 1, 2024');
    expect(formatPostCreatedDate(imported, 'long')).toBe('March 1, 2024');
  });

  it('shows exact dates in the site time zone', () => {
    const lateEvening = { createdAt: '2026-11-23T02:30:00.000Z', timestampPrecision: 'exact' as const };

    expect(formatPostCreatedDate(lateEvening, 'short')).toBe('Nov 22, 2026');
    expect(formatPostEditedDate('2026-11-23T02:30:00.000Z', 'long')).toBe('November 22, 2026');
  });
});

describe('post view helpers', () => {
  it('searches across title, description, path, and tags', () => {
    const text = postSearchableText(buildPostSummary({ description: null, tags: ['eft', 'nuclear'] }));

    expect(text).toBe('First post\n\nphysics/first-post\neft\nnuclear');
  });

  it('links to the admin editor', () => {
    expect(editPostUrl('a b')).toBe('/admin/posts/a%20b/');
    expect(NEW_POST_URL).toBe('/admin/posts/new/');
  });
});

describe('buildPostExportFile', () => {
  it('exports the markdown source and metadata without rendered output', () => {
    const exportFile = buildPostExportFile([buildPost()], new Date('2026-11-22T21:30:00.000Z'));
    const parsed = JSON.parse(exportFile.content) as { exportedAt: string; posts: Record<string, unknown>[] };

    expect(exportFile.fileName).toBe('posts-2026-11-22.json');
    expect(parsed.exportedAt).toBe('2026-11-22T21:30:00.000Z');
    expect(parsed.posts[0]).toStrictEqual({
      id: 'post-1',
      path: 'physics/first-post',
      title: 'First post',
      description: 'About the first post.',
      venue: null,
      tags: ['physics'],
      createdAt: '2026-11-22T21:30:00.000Z',
      timestampPrecision: 'exact',
      updatedAt: null,
      isPublic: true,
      bodyMarkdown: '## Intro\n\nHello.',
    });
    expect(exportFile.content.endsWith('}\n')).toBe(true);
  });
});
