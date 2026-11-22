import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderDiagramSource } from '../../../src/markdown/whiteboard/render-diagram-source';

const CONTENT_DIRECTORY = fileURLToPath(new URL('../../../src/content', import.meta.url));
const DIAGRAM_FENCE_PATTERN = /^```mermaid\n([\s\S]*?)^```/gm;

function markdownFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFilesUnder(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

const diagrams = markdownFilesUnder(CONTENT_DIRECTORY)
  .sort()
  .flatMap((path) =>
    [...readFileSync(path, 'utf8').matchAll(DIAGRAM_FENCE_PATTERN)].map((match, index) => ({
      name: `${relative(CONTENT_DIRECTORY, path)} #${index}`,
      source: match[1] ?? '',
    })),
  );

describe('diagrams in published content', () => {
  it('finds the diagrams', () => {
    expect(diagrams.length).toBeGreaterThan(0);
  });

  it.each(diagrams)('$name renders', async ({ source }) => {
    const markup = await renderDiagramSource(source, 'wb-content');

    expect(markup).toMatch(/^<figure class="whiteboard-diagram"/);
    expect(markup).not.toMatch(/NaN|undefined|Infinity/);
  });
});
