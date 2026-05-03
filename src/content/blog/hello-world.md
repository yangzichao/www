---
title: Hello, World
date: 2026-05-02
description: First post on the new Astro-powered blog.
tags: [meta, astro]
---

This is the first post on the new Astro-powered version of this site. The whole pipeline is markdown-in, static-HTML-out — drop a `.md` file under `src/content/blog/` and it shows up as a page after the next build.

## What works today

- **Frontmatter** is type-checked against a Zod schema in `src/content.config.ts`. Forget a required field and the build fails with a clear message.
- **Nested folders** map straight to nested URLs. See [`/blog/meta/about-this-blog/`](/blog/meta/about-this-blog/) for proof.
- **Drafts** (`draft: true`) skip generation entirely.
- **Code blocks** get default syntax highlighting via Astro's bundled Shiki integration.

```js
function greet(name) {
  return `Hello, ${name}!`;
}

console.log(greet('world'));
```

## What's coming

- KaTeX for math (slice 3) — needed for the physics notes.
- Mermaid for diagrams (slice 3).
- GitHub Actions deployment (slice 4).

[← Back to home](/)
