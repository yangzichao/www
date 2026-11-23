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

## Writing a blog post

Posts live in the D1 `posts` table, not in the repo. Sign in at `/admin/` (GitHub, admin account only) to list every post, then open one or click **New post**.

- The editor is Markdown on the left and a live preview on the right. ⌘/Ctrl+S saves.
- Each post has a title, a path (`category/slug`, which becomes `/blog/category/slug/`), tags, an optional venue and description, and a visibility. New posts start **Private**.
- Private posts are visible only to the admin, never cached or indexed, and have no comments or view counts. Switch to **Public** to publish; no deploy is needed.
- Every post records when it was created and when its content was last edited. Changing only the visibility does not count as an edit.
- `/blog/` sorts by newest, oldest, or recently edited, and filters by tag and search text. The admin also gets a Public / Private filter.
- **Export JSON** on `/admin/` downloads every post's Markdown source and metadata.

The browser renders Markdown to HTML when you save, and the Worker stores both. Pages only read the stored HTML, so the Worker never renders Markdown. Supported Markdown:

- GitHub-flavored Markdown with smart quotes
- **KaTeX math**: inline `$...$` and display `$$...$$`
- **Whiteboard diagrams**: fenced ```` ```mermaid ```` blocks using `flowchart` or `sequenceDiagram` syntax, drawn as hand-drawn SVG (see [Diagrams](#diagrams))
- **Code blocks**: highlighted with Shiki (`github-light`) for bash, http, java, json, python, sql, typescript, and yaml; other languages render as plain text

Changing a post's path changes its URL. Comments and view counts are keyed by URL, so they stay with the old path.

## Diagrams

Diagrams use a subset of Mermaid syntax, but Mermaid never runs. `src/markdown/whiteboard/` parses the block, lays it out with ELK, and draws it with rough.js and the Virgil font in an Excalidraw-like style. The output is a static `<figure>` with inline SVG, a `<title>`, and a `<desc>`. Readers load no diagram JS, and the same source always produces the same bytes. Text widths come from `virgil-advance-widths.generated.ts`; run `npm run generate:virgil-widths` if the font changes.

Supported syntax:

- `flowchart LR|RL|TB|TD|BT` (or `graph`): node shapes `[ ]`, `( )`, `([ ])`, `[[ ]]`, `[( )]`, `(( ))`, `{ }`, `{{ }}`, `[/ /]`, `>]`; edges `-->`, `---`, `-.->`, `==>`, `<-->`, `-->|label|`, `-- label -->`; chains; `A & B --> C`; nested `subgraph … end` with `direction`.
- `sequenceDiagram`: `participant X as Label` (or `actor`), `->>`, `-->>`, `->`, `-->`, self messages, `Note over A`, `Note over A,B`, `Note left of A`, `Note right of A`.
- `<br/>` splits a label into a title line and detail lines.

The component kind sets the icon, color, and silhouette, such as a cylinder for a database, a browser window for a client, or a queue with slots. It is inferred from the node's title line. Add `:::kind` to override it, for example `Q[Ingest]:::stream` or `participant W:::gpu as Worker`. The kinds are `client`, `cdn`, `lb`, `api`, `service`, `compute`, `container`, `queue`, `stream`, `cache`, `db`, `nosql`, `objectstore`, `search`, `scheduler`, `external`, `gpu`, and `process`.

Anything outside this subset, such as `classDef`, `style`, `loop`, or other diagram types, shows an error in the editor preview and blocks the save.

## Project layout

```
src/
  pages/                 ← routes: homepage, blog, thoughts, admin, auth, api
  features/              ← one folder per feature: posts, thoughts, content-view, admin, auth, comments, page-views, http, site-pages
  layouts/, components/  ← Astro shells and shared UI
  lib/, markdown/, scripts/, styles/
migrations/              ← D1 schema and data imports (apply remotely by hand before pushing)
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

Deploy runs `npm run build`, then `wrangler deploy`, and needs both jobs to pass. CI does not apply D1 migrations: run `CI=true npx wrangler d1 migrations apply zichaoyang-com --remote` before pushing a change that needs one. Dependabot opens grouped weekly update PRs for npm and Actions.

## Tech stack

- **Astro 7** with React 19 islands, on Cloudflare Workers
- **D1** for posts, thoughts, page views, sessions, and comments
- **GitHub OAuth** (public profile only) for sign-in; **Turnstile** for anonymous comments
- **Tailwind 4** + `@tailwindcss/typography` for `prose` styling
- **unified** (remark, rehype, KaTeX, Shiki) to render posts in the editor at save time
- **ELK.js + rough.js + Virgil** for whiteboard diagrams (`remarkWhiteboardDiagrams`)

## Permalink stability

The legacy `/research/11be-proton-emission/` URL is preserved as a static redirect to the new `/blog/physics/11be-proton-emission/` location (`astro.config.mjs` → `redirects`). Old `/archive/blog/…` URLs redirect to the same path under `/blog/`. Add new entries there if more URLs ever move.
