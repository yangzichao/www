import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkMermaidToPre } from './src/markdown/remark-mermaid-to-pre.ts';

export default defineConfig({
  site: 'https://zichaoyang.com',

  // Preserve permalinks from the legacy static site so external citations
  // and search-engine results don't break after the URL move. GitHub
  // Pages auto-redirects the no-trailing-slash variant to the directory
  // form, so a single canonical entry is enough.
  redirects: {
    '/research/11be-proton-emission/': '/blog/physics/11be-proton-emission/',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    // `remarkMermaidToPre` runs before Astro's Shiki highlighter sees
    // the code block, so it gets converted to raw HTML and skips
    // syntax highlighting entirely.
    remarkPlugins: [remarkMath, remarkMermaidToPre],
    rehypePlugins: [rehypeKatex],
  },
});
