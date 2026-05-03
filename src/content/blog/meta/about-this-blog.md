---
title: About this blog
date: 2026-05-02
description: How this site is built — and why nested folders just work.
tags: [meta]
---

This page lives at `/blog/meta/about-this-blog/`. The folder structure under `src/content/blog/` translates directly to the URL path, so you can group posts however you like without ever touching the routing layer.

## How the routing works

1. `src/content.config.ts` defines a `blog` collection backed by a glob loader that picks up every `.md` under `src/content/blog/` recursively.
2. `src/pages/blog/[...slug].astro` uses `getStaticPaths` to enumerate every non-draft post and emits one HTML file per entry.
3. The `[...slug]` rest segment captures any depth, so `meta/about-this-blog.md` becomes `meta/about-this-blog` and lands at `/blog/meta/about-this-blog/`.

## Adding a new post

```text
src/content/blog/
├── hello-world.md                       → /blog/hello-world/
├── meta/
│   └── about-this-blog.md               → /blog/meta/about-this-blog/
└── physics/
    └── halo-eft/
        └── 11be-proton-emission.md      → /blog/physics/halo-eft/11be-proton-emission/
```

Push, build, done.

[← Back to home](/)
