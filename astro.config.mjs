import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkMermaidToPre } from './src/markdown/remark-mermaid-to-pre.ts';

export default defineConfig({
  site: 'https://zichaoyang.com',
  devToolbar: {
    enabled: false,
  },

  // Preserve permalinks from the legacy static site so external citations
  // and search-engine results don't break after the URL move. GitHub
  // Pages auto-redirects the no-trailing-slash variant to the directory
  // form, so a single canonical entry is enough.
  redirects: {
    '/research/11be-proton-emission/': '/blog/physics/11be-proton-emission/',
    // The Feynman editor now lives in its own repo at this subdomain.
    '/tools/feynman/': 'https://feynman.zichaoyang.com/',
    // The interactive labs moved to their own repo at lab.zichaoyang.com.
    '/tools/geoduck-dig/': 'https://lab.zichaoyang.com/geoduck-dig/',
    '/tools/quaternions/': 'https://lab.zichaoyang.com/quaternions/',
    '/tools/physics-simulations/': 'https://lab.zichaoyang.com/physics-simulations/',
    '/system-design-lab/': 'https://lab.zichaoyang.com/system-design-lab/',
  },

  vite: {
    plugins: [tailwindcss()],
    // mathjax-full's CJS build falls back to eval('require') for its
    // version lookup unless PACKAGE_VERSION is defined; that eval breaks
    // in Vite's ESM environment (used by the Feynman editor's labels).
    // Dev-server dependency pre-bundling needs the esbuild copy too.
    define: {
      PACKAGE_VERSION: JSON.stringify('3.2.2'),
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          PACKAGE_VERSION: JSON.stringify('3.2.2'),
        },
      },
    },
  },

  markdown: {
    // `remarkMermaidToPre` runs before Astro's Shiki highlighter sees
    // the code block, so it gets converted to raw HTML and skips
    // syntax highlighting entirely.
    remarkPlugins: [remarkMath, remarkMermaidToPre],
    rehypePlugins: [rehypeKatex],
    // Light syntax theme to match the site's white, minimal surface;
    // the dark default clashed with the surrounding page.
    shikiConfig: { theme: 'github-light' },
  },
});
