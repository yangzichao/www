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
        timestampPrecision: 'month',
      }),
    ).toStrictEqual({
      id: 'thought-1',
      tags: ['ai'],
      createdAt: '2026-03-01T00:00:00.000Z',
      displayTimestamp: 'Mar 2026',
      html: '<p>An <em>idea</em>.</p>\n',
    });
  });
});

describe('describeThoughtCount', () => {
  it.each([
    { thoughtCount: 0, expected: 'No thoughts yet' },
    { thoughtCount: 1, expected: '1 thought' },
    { thoughtCount: 9, expected: '9 thoughts' },
  ])('describes $thoughtCount', ({ thoughtCount, expected }) => {
    expect(describeThoughtCount(thoughtCount)).toBe(expected);
  });
});
