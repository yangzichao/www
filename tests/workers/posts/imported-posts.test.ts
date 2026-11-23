import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { findPostByPath, listPostSummaries } from '../../../src/features/posts/store/post-store';

describe('imported markdown posts', () => {
  it('keeps the formerly public posts public and everything archived private', async () => {
    const everyone = await listPostSummaries(env.DB, { includePrivate: false });
    const admin = await listPostSummaries(env.DB, { includePrivate: true });

    expect(everyone.map((post) => post.path).toSorted()).toStrictEqual([
      'ai/review-patterns',
      'growth/reddit-go-to-market-playbook',
      'life/four-traps-of-attention',
      'life/powerful-statements-in-meetings',
      'physics/11be-proton-emission',
    ]);
    expect(admin.length).toBeGreaterThan(40);
    expect(admin.filter((post) => post.path.startsWith('system-design/')).every((post) => !post.isPublic)).toBe(true);
  });

  it('reassembles chunked bodies and keeps day-precision dates', async () => {
    const post = await findPostByPath(env.DB, 'system-design/postgresql/postgresql-to-elasticsearch', {
      includePrivate: true,
    });

    expect(post?.bodyHtml.length).toBeGreaterThan(200_000);
    expect(post?.bodyHtml).toContain('<figure class="whiteboard-diagram"');
    expect(post?.bodyHtml.trimEnd().endsWith('>')).toBe(true);
    expect(post?.timestampPrecision).toBe('day');
    expect(post?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
  });

  it('renders math and headings for the physics paper', async () => {
    const post = await findPostByPath(env.DB, 'physics/11be-proton-emission', { includePrivate: false });

    expect(post).toMatchObject({
      title: 'β-delayed proton emission from ¹¹Be in effective field theory',
      venue: expect.any(String) as unknown,
      isPublic: true,
      updatedAt: null,
    });
    expect(post?.bodyHtml).toContain('class="katex"');
    expect(post?.headings).toContainEqual({ depth: 2, slug: 'key-findings', text: 'Key findings' });
  });
});
