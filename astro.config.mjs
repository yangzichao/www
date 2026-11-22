import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import cloudflare from '@astrojs/cloudflare';
import { remarkMermaidToPre } from './src/markdown/remark-mermaid-to-pre.ts';

export default defineConfig({
  site: 'https://zichaoyang.com',
  adapter: cloudflare(),
  devToolbar: {
    enabled: false,
  },

  redirects: {
    '/research/11be-proton-emission/': '/blog/physics/11be-proton-emission/',
    '/tools/feynman/': 'https://feynman.zichaoyang.com/',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    // `remarkMermaidToPre` runs before Astro's Shiki highlighter sees
    // the code block, so it gets converted to raw HTML and skips
    // syntax highlighting entirely.
    processor: unified({
      remarkPlugins: [remarkMath, remarkMermaidToPre],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: { theme: 'github-light' },
  },
});
