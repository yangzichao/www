# zichaoyang.com

Personal homepage and blog. Static site built with [Astro](https://astro.build), deployed to GitHub Pages via GitHub Actions.

## Quick reference

| What | Where |
| --- | --- |
| Local dev server | `npm run dev` → <http://localhost:4321> |
| Production build | `npm run build` → `dist/` |
| Type-check | `npm run check` |
| Live site | <https://zichaoyang.com> |

## Writing a new blog post

1. Drop a markdown file anywhere under `src/content/blog/`. Folders become URL segments:

   ```
   src/content/blog/hello-world.md                       → /blog/hello-world/
   src/content/blog/meta/about-this-blog.md              → /blog/meta/about-this-blog/
   src/content/blog/physics/halo-eft/some-note.md        → /blog/physics/halo-eft/some-note/
   ```

2. Frontmatter schema (validated at build time by `src/content.config.ts`):

   ```yaml
   ---
   title: My post title              # required
   date: 2026-05-07                  # required (YYYY-MM-DD)
   description: Short summary.       # optional, used for <meta name="description">
   draft: false                      # optional, default false; true = skip during build
   tags: [meta, astro]               # optional, list of strings
   venue: Physics Letters B          # optional, shown for paper entries
   ---
   ```

3. Body is plain GitHub-flavored markdown plus:
   - **KaTeX math** — inline `$...$` and display `$$...$$`
   - **Mermaid diagrams** — fenced ```` ```mermaid ```` blocks (rendered client-side via lazy-loaded CDN)
   - **Code blocks** — syntax-highlighted by Astro's bundled Shiki

4. `git add . && git commit -m "post: …" && git push` — Actions builds + deploys, live in ~2 minutes.

## Project layout

```
src/
  pages/
    index.astro                  ← homepage
    blog/[...slug].astro         ← dynamic route for every blog post
  layouts/
    BaseLayout.astro             ← html shell, head, fonts
    PostLayout.astro             ← prose article template + Mermaid loader
  components/
    Header.astro
    WorkCard.astro
    Footer.astro
  data/
    site.ts                      ← profile, social links, homepage cards
  content/
    blog/                        ← all markdown posts (recursive)
  content.config.ts              ← Zod schema for blog frontmatter
  markdown/
    remark-mermaid-to-pre.ts     ← custom plugin: ```mermaid → <pre class="mermaid">
  styles/
    global.css                   ← Tailwind 4 + typography + handwritten homepage styles
public/
  CNAME                          ← custom domain (zichaoyang.com)
  avatar.jpg, hoah-cover.jpg     ← static assets, served at /avatar.jpg etc.
.github/workflows/
  deploy.yml                     ← GitHub Actions: build + deploy to Pages
astro.config.mjs                 ← redirects + remark/rehype plugins (math, mermaid)
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`:

```
checkout → npm ci → npm run check → npm run build → upload-pages-artifact → deploy-pages
```

`public/CNAME` (containing `zichaoyang.com`) is passed through to `dist/CNAME` so the custom domain survives every deploy.

### One-time GitHub Pages settings

These are configured once and persist across deploys:

1. **Settings → Pages → Source** must be **GitHub Actions** (not "Deploy from a branch").
2. **Settings → Pages → Custom domain** must be `zichaoyang.com`.
3. **Settings → Pages → Enforce HTTPS** should be checked.

⚠️ If you ever change the Source field, GitHub will clear the Custom domain field — you'll need to re-enter it.

## Tech stack

- **Astro 5** — static site generator
- **TypeScript** strict mode (`astro check`)
- **Tailwind 4** + `@tailwindcss/typography` — for `prose` markdown styling
- **remark-math + rehype-katex** — server-side LaTeX rendering at build time
- **`remarkMermaidToPre`** (custom, ~30 lines) — turns mermaid blocks into `<pre class="mermaid">` so a tiny client script (lazy-loaded from esm.sh CDN, only when a diagram is on the page) can render them
- **Phosphor Icons** — via CDN, used in homepage social links

## Permalink stability

The legacy `/research/11be-proton-emission/` URL is preserved as a static redirect to the new `/blog/physics/11be-proton-emission/` location (`astro.config.mjs` → `redirects`). Add new entries there if more URLs ever move.
