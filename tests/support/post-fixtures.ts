import type { Post, PostSubmission, PostSummary } from '../../src/features/posts/post-types';

export function buildPostSummary(overrides: Partial<PostSummary> = {}): PostSummary {
  return {
    id: 'post-1',
    path: 'physics/first-post',
    title: 'First post',
    description: 'About the first post.',
    venue: null,
    tags: ['physics'],
    createdAt: '2026-11-22T21:30:00.000Z',
    timestampPrecision: 'exact',
    updatedAt: null,
    isPublic: true,
    ...overrides,
  };
}

export function buildPost(overrides: Partial<Post> = {}): Post {
  return {
    ...buildPostSummary(overrides),
    bodyMarkdown: '## Intro\n\nHello.',
    bodyHtml: '<h2 id="intro">Intro</h2>\n<p>Hello.</p>',
    headings: [{ depth: 2, slug: 'intro', text: 'Intro' }],
    ...overrides,
  };
}

export function buildPostSubmission(overrides: Partial<PostSubmission> = {}): PostSubmission {
  return {
    path: 'testing/first-post',
    title: 'First post',
    description: 'About the first post.',
    venue: null,
    tags: ['testing'],
    bodyMarkdown: '## Intro\n\nHello.',
    bodyHtml: '<h2 id="intro">Intro</h2>\n<p>Hello.</p>',
    headings: [{ depth: 2, slug: 'intro', text: 'Intro' }],
    isPublic: true,
    ...overrides,
  };
}
