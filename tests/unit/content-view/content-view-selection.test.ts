import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTENT_VIEW_QUERY,
  type ContentViewQuery,
} from '../../../src/features/content-view/content-view-query';
import {
  countTags,
  selectContentForView,
  type ViewableContent,
} from '../../../src/features/content-view/content-view-selection';

interface Note extends ViewableContent {
  body: string;
}

function note(overrides: Partial<Note> & Pick<Note, 'id' | 'createdAt'>): Note {
  return { body: '', tags: [], updatedAt: null, isPublic: true, ...overrides };
}

function searchableText(note: Note): string {
  return [note.body, ...note.tags].join('\n');
}

function select(notes: readonly Note[], query: ContentViewQuery): Note[] {
  return selectContentForView(notes, query, searchableText);
}

const marchIdea = note({
  id: 'march',
  createdAt: '2026-03-01T00:00:00.000Z',
  body: 'Field theory',
  tags: ['physics'],
});
const julyIdea = note({
  id: 'july',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  body: 'Agents',
  tags: ['ai', 'physics'],
  isPublic: false,
});
const mayIdeaA = note({ id: 'may-a', createdAt: '2026-05-01T00:00:00.000Z', body: 'Ship small', tags: ['ai'] });
const mayIdeaB = note({ id: 'may-b', createdAt: '2026-05-01T00:00:00.000Z', body: 'Rest more' });
const allNotes = [marchIdea, julyIdea, mayIdeaA, mayIdeaB];

function idsFor(changes: Partial<ContentViewQuery>): string[] {
  return select(allNotes, { ...DEFAULT_CONTENT_VIEW_QUERY, ...changes }).map(({ id }) => id);
}

describe('selectContentForView', () => {
  it.each([
    { sort: 'newest', expected: ['july', 'may-b', 'may-a', 'march'] },
    { sort: 'oldest', expected: ['march', 'may-a', 'may-b', 'july'] },
    { sort: 'recently-edited', expected: ['july', 'may-b', 'may-a', 'march'] },
  ] as const)('orders by $sort', ({ sort, expected }) => {
    expect(idsFor({ sort })).toStrictEqual(expected);
  });

  it('puts an old thought first under recently edited once it is edited', () => {
    const editedMarch = { ...marchIdea, updatedAt: '2026-11-20T00:00:00.000Z' };
    const ids = select([marchIdea, julyIdea].with(0, editedMarch), {
      ...DEFAULT_CONTENT_VIEW_QUERY,
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

describe('countTags', () => {
  it('counts tags, most used first, then alphabetically', () => {
    expect(countTags([...allNotes, note({ id: 'x', createdAt: '2026-01-01', tags: ['life'] })])).toStrictEqual([
      { tag: 'ai', count: 2 },
      { tag: 'physics', count: 2 },
      { tag: 'life', count: 1 },
    ]);
  });
});
