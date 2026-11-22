# zichaoyang.com

Personal homepage and blog. Built with [Astro](https://astro.build) and React islands, served by a Cloudflare Worker with D1 for page views, comments, and sessions.

## Quick reference

| What | Command |
| --- | --- |
| Local dev server | `npm run dev` → <http://localhost:4321> |
| Production build | `npm run build` → `dist/` |
| Everything CI checks, minus E2E | `npm run verify` |
| Format / check formatting | `npm run format` / `npm run format:check` |
| Lint TS, TSX, Astro / CSS | `npm run lint` / `npm run lint:css` |
| Type-check | `npm run check` |
| Unused files, exports, deps | `npm run knip` |
| Unit, component, Worker tests | `npm test` (`npm run test:coverage` for coverage) |
| End-to-end tests | `npm run test:e2e` |
| Live site | <https://zichaoyang.com> |

Use the Node version in `.node-version` (`engine-strict` is on, so `npm ci` refuses other versions).

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
   - **Whiteboard diagrams** — fenced ```` ```mermaid ```` blocks using `flowchart` or `sequenceDiagram` syntax, drawn at build time as hand-drawn SVG (see [Diagrams](#diagrams))
   - **Code blocks** — syntax-highlighted by Astro's bundled Shiki

4. `git add . && git commit -m "post: …" && git push`. CI verifies, builds, and deploys; the post is live in a few minutes.

## Diagrams

Diagrams use a subset of Mermaid syntax, but Mermaid never runs. `src/markdown/whiteboard/` parses the block, lays it out with ELK, and draws it with rough.js and the Virgil font in an Excalidraw-like style. The output is a static `<figure>` with inline SVG, a `<title>`, and a `<desc>`. No client JS is involved, and the same source always produces the same bytes.

Supported syntax:

- `flowchart LR|RL|TB|TD|BT` (or `graph`): node shapes `[ ]`, `( )`, `([ ])`, `[[ ]]`, `[( )]`, `(( ))`, `{ }`, `{{ }}`, `[/ /]`, `>]`; edges `-->`, `---`, `-.->`, `==>`, `<-->`, `-->|label|`, `-- label -->`; chains; `A & B --> C`; nested `subgraph … end` with `direction`.
- `sequenceDiagram`: `participant X as Label` (or `actor`), `->>`, `-->>`, `->`, `-->`, self messages, `Note over A`, `Note over A,B`, `Note left of A`, `Note right of A`.
- `<br/>` splits a label into a title line and detail lines.

The component kind sets the icon, color, and silhouette, such as a cylinder for a database, a browser window for a client, or a queue with slots. It is inferred from the node's title line. Add `:::kind` to override it, for example `Q[Ingest]:::stream` or `participant W:::gpu as Worker`. The kinds are `client`, `cdn`, `lb`, `api`, `service`, `compute`, `container`, `queue`, `stream`, `cache`, `db`, `nosql`, `objectstore`, `search`, `scheduler`, `external`, `gpu`, and `process`.

Anything outside this subset, such as `classDef`, `style`, `loop`, or other diagram types, fails the build with the file and line number.

## Project layout

```
src/
  pages/                 ← routes: homepage, blog, thoughts, admin, auth, api
  features/              ← one folder per feature: admin, auth, comments, page-views, http, site-pages
  layouts/, components/  ← Astro shells and shared UI
  content/               ← markdown posts and thoughts
  lib/, loaders/, markdown/, scripts/, styles/
migrations/              ← D1 schema
tests/
  unit/                  ← pure logic, Node
  components/            ← React islands and browser scripts, happy-dom
  workers/               ← API routes and stores against a real local D1 (workerd)
  e2e/                   ← Playwright against `wrangler dev` with a seeded local D1
  support/               ← shared fakes and fixtures
tooling/lint/            ← the custom no-comments rule for ESLint and Stylelint
```

## Quality gates

- **Formatting:** Prettier with the Astro and Tailwind plugins.
- **Linting:** ESLint with type-aware `typescript-eslint` strict rules, React, hooks, jsx-a11y, Astro, Vitest, and a local `no-comments` rule that enforces `AGENTS.md`. Stylelint covers CSS and Astro `<style>` blocks.
- **Types:** `astro check` with `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- **Tests:** Vitest projects for unit, components, and Workers, with coverage thresholds of 95% statements and functions, 90% branches, and 97% lines. E2E runs Playwright on Chromium against the built Worker.
- **Determinism:** exact dependency versions, a pinned Node version, `TZ=UTC`, a fixed shuffle seed, no `.only`, mocks restored after each test, and no real network. Turnstile is served by a local fake in E2E.
- **Git hooks:** lefthook runs Prettier, ESLint, and Stylelint on staged files before each commit, and `npm run verify` before each push.

## Deployment

`.github/workflows/ci.yml` runs on every push and pull request:

```
verify (format, lint, types, knip, coverage)   e2e (build + Playwright)
                       └──────────── deploy (main only) ────────────┘
```

Deploy runs `npm run build`, then `wrangler deploy`, and needs both jobs to pass. Dependabot opens grouped weekly update PRs for npm and Actions.

## Tech stack

- **Astro 7** with React 19 islands, on Cloudflare Workers
- **D1** for page views, sessions, and comments
- **GitHub OAuth** for sign-in and the admin post editor; **Turnstile** for anonymous comments
- **Tailwind 4** + `@tailwindcss/typography` for `prose` styling
- **remark-math + rehype-katex** for build-time LaTeX
- **ELK.js + rough.js + Virgil** for build-time whiteboard diagrams (`remarkWhiteboardDiagrams`)

## Permalink stability

The legacy `/research/11be-proton-emission/` URL is preserved as a static redirect to the new `/blog/physics/11be-proton-emission/` location (`astro.config.mjs` → `redirects`). Add new entries there if more URLs ever move.
