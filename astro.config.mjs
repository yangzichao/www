import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

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
    '/archive/blog/': '/blog/?visibility=private',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
