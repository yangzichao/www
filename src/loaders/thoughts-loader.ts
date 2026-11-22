import { readFileSync, readdirSync, statSync } from 'fs';
import { basename, join } from 'path';
import type { Loader } from 'astro/loaders';
import { marked } from 'marked';

const YEAR_DIRECTORY_PATTERN = /^\d{4}$/;
const MONTH_FILE_PATTERN = /^\d{4}-\d{2}\.md$/;
const THOUGHT_SEPARATOR_PATTERN = /\n\s*---\s*\n/;
const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
const TAGS_LINE_PATTERN = /^tags:\s*\[([^\]]*)\]/m;

interface ParsedMonthFile {
  tags: string[];
  body: string;
}

function listMonthFilePaths(thoughtsDirectory: string): string[] {
  return readdirSync(thoughtsDirectory)
    .filter((entry) => YEAR_DIRECTORY_PATTERN.test(entry))
    .filter((entry) => statSync(join(thoughtsDirectory, entry)).isDirectory())
    .sort()
    .flatMap((yearDirectory) => {
      const yearPath = join(thoughtsDirectory, yearDirectory);
      return readdirSync(yearPath)
        .filter((fileName) => MONTH_FILE_PATTERN.test(fileName))
        .sort()
        .map((fileName) => join(yearPath, fileName));
    });
}

function firstDayOfMonth(monthStem: string): Date {
  const [year, month] = monthStem.split('-').map(Number);
  if (year === undefined || month === undefined) throw new Error(`Invalid thoughts file name: ${monthStem}`);
  return new Date(Date.UTC(year, month - 1, 1));
}

function parseTagList(frontmatter: string): string[] {
  const tagList = TAGS_LINE_PATTERN.exec(frontmatter)?.[1];
  if (!tagList) return [];
  return tagList
    .split(',')
    .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseMonthFile(content: string): ParsedMonthFile {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) return { tags: [], body: content.trim() };
  const [, frontmatter = '', body = ''] = match;
  return { tags: parseTagList(frontmatter), body: body.trim() };
}

function splitIntoThoughts(body: string): string[] {
  return body
    .split(THOUGHT_SEPARATOR_PATTERN)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function thoughtsLoader(thoughtsDirectory: string): Loader {
  return {
    name: 'thoughts-loader',
    async load({ store, logger }) {
      store.clear();

      for (const filePath of listMonthFilePaths(thoughtsDirectory)) {
        const monthStem = basename(filePath, '.md');
        const { tags, body } = parseMonthFile(readFileSync(filePath, 'utf-8'));
        const date = firstDayOfMonth(monthStem);
        const thoughts = splitIntoThoughts(body);

        for (const [index, thought] of thoughts.entries()) {
          store.set({
            id: `${monthStem}-${String(index + 1).padStart(2, '0')}`,
            data: { date, tags },
            body: thought,
            rendered: { html: await marked.parse(thought) },
          });
        }

        logger.info(`thoughts: ${monthStem} → ${thoughts.length} block(s)`);
      }
    },
  };
}
