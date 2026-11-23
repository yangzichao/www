import { describe, expect, it } from 'vitest';
import { buildThoughtExportFile, parseThoughtExportFormat } from '../../../src/features/thoughts/thought-export';
import type { Thought } from '../../../src/features/thoughts/thought-types';

const EXPORTED_AT = new Date('2026-11-22T21:30:00.000Z');

const exactThought: Thought = {
  id: 'exact-id',
  body: 'A *fresh* idea.',
  tags: ['ai', 'systems'],
  createdAt: '2026-11-22T20:00:00.000Z',
  updatedAt: null,
  timestampPrecision: 'exact',
  isPublic: true,
};

const editedPrivateThought: Thought = {
  id: 'private-id',
  body: 'A revised secret.',
  tags: ['life'],
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-21T09:00:00.000Z',
  timestampPrecision: 'exact',
  isPublic: false,
};

const legacyThought: Thought = {
  id: 'legacy-2026-03-01',
  body: 'An old idea.',
  tags: [],
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: null,
  timestampPrecision: 'month',
  isPublic: true,
};

describe('parseThoughtExportFormat', () => {
  it.each([
    { rawFormat: null, expected: 'markdown' },
    { rawFormat: 'markdown', expected: 'markdown' },
    { rawFormat: 'json', expected: 'json' },
    { rawFormat: 'csv', expected: null },
  ])('maps $rawFormat to $expected', ({ rawFormat, expected }) => {
    expect(parseThoughtExportFormat(rawFormat)).toBe(expected);
  });
});

describe('buildThoughtExportFile', () => {
  it('writes a dated markdown file with one section per thought', () => {
    const exportFile = buildThoughtExportFile([exactThought, legacyThought], 'markdown', EXPORTED_AT);

    expect(exportFile.fileName).toBe('thoughts-2026-11-22.md');
    expect(exportFile.contentType).toBe('text/markdown; charset=utf-8');
    expect(exportFile.content).toBe(
      [
        '# Thoughts\n\nExported 2026-11-22T21:30:00.000Z · 2 thoughts\n',
        '## 2026-11-22T20:00:00.000Z\n\nTags: ai, systems\n\nA *fresh* idea.\n',
        '## 2026-03\n\nAn old idea.\n',
      ].join('\n---\n\n'),
    );
  });

  it('lists the edit time, private visibility, and tags as metadata lines', () => {
    expect(buildThoughtExportFile([editedPrivateThought], 'markdown', EXPORTED_AT).content).toContain(
      '## 2026-11-20T10:00:00.000Z\n\nEdited: 2026-11-21T09:00:00.000Z  \nVisibility: private  \nTags: life\n\nA revised secret.\n',
    );
  });

  it('uses the singular for a single thought', () => {
    expect(buildThoughtExportFile([legacyThought], 'markdown', EXPORTED_AT).content).toContain('· 1 thought\n');
  });

  it('writes a JSON file that round-trips every field', () => {
    const exportFile = buildThoughtExportFile([exactThought, legacyThought], 'json', EXPORTED_AT);

    expect(exportFile.fileName).toBe('thoughts-2026-11-22.json');
    expect(exportFile.contentType).toBe('application/json; charset=utf-8');
    expect(JSON.parse(exportFile.content)).toStrictEqual({
      exportedAt: '2026-11-22T21:30:00.000Z',
      thoughts: [exactThought, legacyThought],
    });
  });
});
