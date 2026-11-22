import type { PublicThought } from './thought-types';

export type ThoughtExportFormat = 'markdown' | 'json';

export interface ThoughtExportFile {
  fileName: string;
  contentType: string;
  content: string;
}

export function parseThoughtExportFormat(rawFormat: string | null): ThoughtExportFormat | null {
  if (rawFormat === null || rawFormat === 'markdown') return 'markdown';
  if (rawFormat === 'json') return 'json';
  return null;
}

function thoughtHeading(thought: PublicThought): string {
  return thought.timestampPrecision === 'month' ? thought.createdAt.slice(0, 7) : thought.createdAt;
}

function thoughtAsMarkdownSection(thought: PublicThought): string {
  const tagLine = thought.tags.length > 0 ? `Tags: ${thought.tags.join(', ')}\n\n` : '';
  return `## ${thoughtHeading(thought)}\n\n${tagLine}${thought.body}\n`;
}

function countLabel(thoughtCount: number): string {
  return `${thoughtCount} ${thoughtCount === 1 ? 'thought' : 'thoughts'}`;
}

function serializeAsMarkdown(thoughts: readonly PublicThought[], exportedAt: string): string {
  const header = `# Thoughts\n\nExported ${exportedAt} · ${countLabel(thoughts.length)}\n`;
  return [header, ...thoughts.map(thoughtAsMarkdownSection)].join('\n---\n\n');
}

function serializeAsJson(thoughts: readonly PublicThought[], exportedAt: string): string {
  return `${JSON.stringify({ exportedAt, thoughts }, null, 2)}\n`;
}

export function buildThoughtExportFile(
  thoughts: readonly PublicThought[],
  format: ThoughtExportFormat,
  exportedAt: Date,
): ThoughtExportFile {
  const exportedAtIso = exportedAt.toISOString();
  const fileStem = `thoughts-${exportedAtIso.slice(0, 10)}`;
  if (format === 'json') {
    return {
      fileName: `${fileStem}.json`,
      contentType: 'application/json; charset=utf-8',
      content: serializeAsJson(thoughts, exportedAtIso),
    };
  }
  return {
    fileName: `${fileStem}.md`,
    contentType: 'text/markdown; charset=utf-8',
    content: serializeAsMarkdown(thoughts, exportedAtIso),
  };
}
