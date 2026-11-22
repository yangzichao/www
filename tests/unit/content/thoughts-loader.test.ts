import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { thoughtsLoader } from '../../../src/loaders/thoughts-loader';

describe('thoughtsLoader', () => {
  let thoughtsDirectory: string;

  beforeEach(() => {
    thoughtsDirectory = mkdtempSync(join(tmpdir(), 'thoughts-'));
  });

  afterEach(() => {
    rmSync(thoughtsDirectory, { recursive: true, force: true });
  });

  function writeThoughtFile(relativePath: string, content: string) {
    const filePath = join(thoughtsDirectory, relativePath);
    mkdirSync(join(filePath, '..'), { recursive: true });
    writeFileSync(filePath, content);
  }

  async function loadEntries() {
    const entries: { id: string; data: unknown; body: string | undefined; html: string }[] = [];
    const store = {
      clear: vi.fn(),
      set: vi.fn((entry: { id: string; data: unknown; body?: string; rendered: { html: string } }) => {
        entries.push({ id: entry.id, data: entry.data, body: entry.body, html: entry.rendered.html });
        return true;
      }),
    };
    const logger = { info: vi.fn() };
    await thoughtsLoader(thoughtsDirectory).load({ store, logger } as never);
    return { entries, store, logger };
  }

  it('splits each month file into numbered thoughts dated the first of the month', async () => {
    writeThoughtFile('2026/2026-03.md', "---\ntags: [life, 'work']\n---\n\nFirst *thought*.\n\n---\n\nSecond.\n");

    const { entries, store } = await loadEntries();

    expect(store.clear).toHaveBeenCalledExactlyOnceWith();
    expect(entries).toStrictEqual([
      {
        id: '2026-03-01',
        data: { date: new Date('2026-03-01T00:00:00.000Z'), tags: ['life', 'work'] },
        body: 'First *thought*.',
        html: '<p>First <em>thought</em>.</p>\n',
      },
      {
        id: '2026-03-02',
        data: { date: new Date('2026-03-01T00:00:00.000Z'), tags: ['life', 'work'] },
        body: 'Second.',
        html: '<p>Second.</p>\n',
      },
    ]);
  });

  it('reads years and months in order and skips files that do not match the layout', async () => {
    writeThoughtFile('2026/2026-02.md', 'February');
    writeThoughtFile('2025/2025-12.md', 'December');
    writeThoughtFile('2026/notes.md', 'ignored');
    writeThoughtFile('drafts/2026-01.md', 'ignored');
    writeThoughtFile('2024', 'a file, not a year directory');

    const { entries } = await loadEntries();

    expect(entries.map((entry) => [entry.id, entry.data])).toStrictEqual([
      ['2025-12-01', { date: new Date('2025-12-01T00:00:00.000Z'), tags: [] }],
      ['2026-02-01', { date: new Date('2026-02-01T00:00:00.000Z'), tags: [] }],
    ]);
  });
});
