import { describe, expect, it } from 'vitest';
import type { Thought } from '../../../../src/features/thoughts/thought-types';
import {
  DEFAULT_THOUGHT_VIEW_QUERY,
  type ThoughtViewQuery,
} from '../../../../src/features/thoughts/view/thought-view-query';
import { countThoughtTags, selectThoughtsForView } from '../../../../src/features/thoughts/view/thought-view-selection';

function thought(overrides: Partial<Thought> & Pick<Thought, 'id' | 'createdAt'>): Thought {
  return { body: '', tags: [], updatedAt: null, timestampPrecision: 'exact', isPublic: true, ...overrides };
}

const marchIdea = thought({
  id: 'march',
  createdAt: '2026-03-01T00:00:00.000Z',
  body: 'Field theory',
  tags: ['physics'],
});
const julyIdea = thought({
  id: 'july',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  body: 'Agents',
  tags: ['ai', 'physics'],
  isPublic: false,
});
const mayIdeaA = thought({ id: 'may-a', createdAt: '2026-05-01T00:00:00.000Z', body: 'Ship small', tags: ['ai'] });
const mayIdeaB = thought({ id: 'may-b', createdAt: '2026-05-01T00:00:00.000Z', body: 'Rest more' });
const allThoughts = [marchIdea, julyIdea, mayIdeaA, mayIdeaB];

function idsFor(changes: Partial<ThoughtViewQuery>): string[] {
  return selectThoughtsForView(allThoughts, { ...DEFAULT_THOUGHT_VIEW_QUERY, ...changes }).map(({ id }) => id);
}

describe('selectThoughtsForView', () => {
  it.each([
    { sort: 'newest', expected: ['july', 'may-b', 'may-a', 'march'] },
    { sort: 'oldest', expected: ['march', 'may-a', 'may-b', 'july'] },
    { sort: 'recently-edited', expected: ['july', 'may-b', 'may-a', 'march'] },
  ] as const)('orders by $sort', ({ sort, expected }) => {
    expect(idsFor({ sort })).toStrictEqual(expected);
  });

  it('puts an old thought first under recently edited once it is edited', () => {
    const editedMarch = { ...marchIdea, updatedAt: '2026-11-20T00:00:00.000Z' };
    const ids = selectThoughtsForView([marchIdea, julyIdea].with(0, editedMarch), {
      ...DEFAULT_THOUGHT_VIEW_QUERY,
      sort: 'recently-edited',
    }).map(({ id }) => id);

    expect(ids).toStrictEqual(['march', 'july']);
  });

  it.each([
    { changes: { visibility: 'public' }, expected: ['may-b', 'may-a', 'march'] },
    { changes: { visibility: 'private' }, expected: ['july'] },
    { changes: { tag: 'ai' }, expected: ['july', 'may-a'] },
    { changes: { search: 'SHIP' }, expected: ['may-a'] },
    { changes: { search: 'physics' }, expected: ['july', 'march'] },
    { changes: { tag: 'physics', visibility: 'public' }, expected: ['march'] },
  ] as const)('filters with $changes', ({ changes, expected }) => {
    expect(idsFor(changes)).toStrictEqual(expected);
  });
});

describe('countThoughtTags', () => {
  it('counts tags, most used first, then alphabetically', () => {
    expect(
      countThoughtTags([...allThoughts, thought({ id: 'x', createdAt: '2026-01-01', tags: ['life'] })]),
    ).toStrictEqual([
      { tag: 'ai', count: 2 },
      { tag: 'physics', count: 2 },
      { tag: 'life', count: 1 },
    ]);
  });
});
