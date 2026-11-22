import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import type { Loader } from 'astro/loaders';
import { marked } from 'marked';

export function thoughtsLoader(thoughtsDir: string): Loader {
  return {
    name: 'thoughts-loader',
    async load({ store, logger }) {
      store.clear();

      const yearDirs = readdirSync(thoughtsDir)
        .filter((entry) => /^\d{4}$/.test(entry))
        .filter((entry) => statSync(join(thoughtsDir, entry)).isDirectory())
        .sort();

      const filePaths: string[] = [];
      for (const yearDir of yearDirs) {
        const yearPath = join(thoughtsDir, yearDir);
        const monthFiles = readdirSync(yearPath)
          .filter((f) => /^\d{4}-\d{2}\.md$/.test(f))
          .sort()
          .map((f) => join(yearPath, f));
        filePaths.push(...monthFiles);
      }

      for (const filePath of filePaths) {
        const file = basename(filePath);
        const raw = readFileSync(filePath, 'utf-8');

        const { tags, body } = parseFrontmatter(raw);
        const monthStr = file.replace('.md', '');
        const [year, month] = monthStr.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, 1));

        const blocks = body
          .split(/\n\s*---\s*\n/)
          .map((b) => b.trim())
          .filter(Boolean);

        for (let i = 0; i < blocks.length; i++) {
          const id = `${monthStr}-${String(i + 1).padStart(2, '0')}`;
          const html = await marked.parse(blocks[i]);

          store.set({
            id,
            data: { date, tags },
            body: blocks[i],
            rendered: { html },
          });
        }

        logger.info(`thoughts: ${monthStr} → ${blocks.length} block(s)`);
      }
    },
  };
}

function parseFrontmatter(content: string): { tags: string[]; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { tags: [], body: content.trim() };

  const fm = match[1];
  const body = match[2].trim();

  const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
  const tags = tagsMatch
    ? tagsMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    : [];

  return { tags, body };
}
