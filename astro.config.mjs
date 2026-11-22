import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { remarkWhiteboardDiagrams } from './src/markdown/whiteboard/remark-whiteboard-diagrams.ts';

export default defineConfig({
  site: 'https://zichaoyang.com',
  adapter: cloudflare(),
  integrations: [react()],
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
    processor: unified({
      remarkPlugins: [remarkMath, remarkWhiteboardDiagrams],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: { theme: 'github-light' },
  },
});
