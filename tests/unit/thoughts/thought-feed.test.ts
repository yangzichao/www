import { describe, expect, it } from 'vitest';
import { formatThoughtTimestamp } from '../../../src/features/thoughts/thought-date-format';
import { describeThoughtCount, toThoughtFeedItem } from '../../../src/features/thoughts/thought-feed';

describe('formatThoughtTimestamp', () => {
  it('shows exact thoughts with date and time in the site time zone', () => {
    expect(formatThoughtTimestamp({ createdAt: '2026-11-23T01:05:00.000Z', timestampPrecision: 'exact' })).toBe(
      'Nov 22, 2026, 8:05 PM',
    );
  });

  it('shows legacy thoughts with only the month they were filed under', () => {
    expect(formatThoughtTimestamp({ createdAt: '2026-03-01T00:00:00.000Z', timestampPrecision: 'month' })).toBe(
      'Mar 2026',
    );
  });
});

describe('toThoughtFeedItem', () => {
  it('renders the markdown body and keeps the metadata', () => {
    expect(
      toThoughtFeedItem({
        id: 'thought-1',
        body: 'An *idea*.',
        tags: ['ai'],
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: null,
        timestampPrecision: 'month',
        isPublic: true,
      }),
    ).toStrictEqual({
      id: 'thought-1',
      body: 'An *idea*.',
      tags: ['ai'],
      isPublic: true,
      createdAt: '2026-03-01T00:00:00.000Z',
      displayTimestamp: 'Mar 2026',
      updatedAt: null,
      displayEditedTimestamp: null,
      html: '<p>An <em>idea</em>.</p>\n',
    });
  });

  it('shows the edit time of an edited thought in the site time zone', () => {
    const item = toThoughtFeedItem({
      id: 'thought-2',
      body: 'Revised.',
      tags: [],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-11-23T01:05:00.000Z',
      timestampPrecision: 'month',
      isPublic: false,
    });

    expect(item).toMatchObject({ isPublic: false, displayEditedTimestamp: 'Nov 22, 2026, 8:05 PM' });
  });
});

describe('describeThoughtCount', () => {
  it.each([
    { shownCount: 0, totalCount: 0, expected: 'No thoughts yet' },
    { shownCount: 1, totalCount: 1, expected: '1 thought' },
    { shownCount: 9, totalCount: 9, expected: '9 thoughts' },
    { shownCount: 0, totalCount: 1, expected: '0 of 1 thought' },
    { shownCount: 2, totalCount: 9, expected: '2 of 9 thoughts' },
  ])('describes $shownCount of $totalCount', ({ shownCount, totalCount, expected }) => {
    expect(describeThoughtCount(shownCount, totalCount)).toBe(expected);
  });
});
