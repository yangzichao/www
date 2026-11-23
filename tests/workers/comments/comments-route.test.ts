import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CommentThreadResponse, CreateCommentResponse } from '../../../src/features/comments/comment-types';
import { insertComment } from '../../../src/features/comments/comment-store';
import { GET, POST } from '../../../src/pages/api/comments/index';
import { PRIVATE_TEST_POST_PAGE, PUBLISHED_TEST_PAGE } from '../../support/published-pages';
import { ALWAYS_PASSING_TURNSTILE_SECRET } from '../../support/test-secrets';
import { callRoute } from '../support/api-context';
import { resetDatabase, signInAdmin, signInVisitor, VISITOR_PROFILE } from '../support/database';
import { stubOutboundFetch } from '../support/fetch-stub';

const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function stubTurnstile(success: boolean) {
  return stubOutboundFetch((request) => {
    if (request.url !== TURNSTILE_SITEVERIFY_URL) return new Response('unexpected request', { status: 500 });
    return Response.json({ success });
  });
}

async function seedPendingComment() {
  return insertComment(env.DB, {
    pagePath: PUBLISHED_TEST_PAGE,
    body: 'Awaiting review',
    authorKind: 'anonymous',
    authorName: 'Anonymous',
    githubLogin: null,
    githubAvatarUrl: null,
    status: 'pending',
  });
}

async function fetchThread(cookies?: Record<string, string>) {
  const { response } = await callRoute(GET, {
    path: `/api/comments?path=${encodeURIComponent(PUBLISHED_TEST_PAGE)}`,
    ...(cookies ? { cookies } : {}),
  });
  return { status: response.status, thread: await response.json<CommentThreadResponse>() };
}

describe('GET /api/comments', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('hides pending comments and reports no viewer to anonymous readers', async () => {
    await seedPendingComment();

    await expect(fetchThread()).resolves.toStrictEqual({ status: 200, thread: { comments: [], viewer: null } });
  });

  it('identifies a signed-in visitor without exposing pending comments', async () => {
    await seedPendingComment();
    const { thread } = await fetchThread(await signInVisitor());

    expect(thread).toStrictEqual({
      comments: [],
      viewer: { login: VISITOR_PROFILE.login, avatarUrl: VISITOR_PROFILE.avatarUrl, isAdmin: false },
    });
  });

  it('shows pending comments to the admin', async () => {
    await seedPendingComment();
    const { thread } = await fetchThread(await signInAdmin());

    expect(thread.viewer?.isAdmin).toBe(true);
    expect(thread.comments.map((comment) => comment.status)).toStrictEqual(['pending']);
  });

  it('rejects an invalid page path', async () => {
    const { response } = await callRoute(GET, { path: '/api/comments?path=..%2Fsecret' });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/comments', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('publishes a signed-in visitor comment immediately without Turnstile', async () => {
    const outbound = stubTurnstile(false);
    const { response } = await callRoute(POST, {
      method: 'POST',
      path: '/api/comments',
      cookies: await signInVisitor(),
      body: { pagePath: PUBLISHED_TEST_PAGE, body: '  Great write-up  ', authorName: 'ignored', turnstileToken: '' },
    });
    const { comment } = await response.json<CreateCommentResponse>();

    expect(response.status).toBe(201);
    expect(outbound).toHaveLength(0);
    expect(comment).toMatchObject({
      body: 'Great write-up',
      authorKind: 'github',
      authorName: VISITOR_PROFILE.login,
      githubLogin: VISITOR_PROFILE.login,
      status: 'published',
    });
  });

  it('queues an anonymous comment for review after Turnstile passes', async () => {
    const outbound = stubTurnstile(true);
    const { response } = await callRoute(POST, {
      method: 'POST',
      path: '/api/comments',
      body: { pagePath: PUBLISHED_TEST_PAGE, body: 'Hi there', authorName: '', turnstileToken: 'widget-token' },
    });
    const { comment } = await response.json<CreateCommentResponse>();

    expect(response.status).toBe(201);
    expect(comment).toMatchObject({ authorKind: 'anonymous', authorName: 'Anonymous', status: 'pending' });
    expect(outbound).toHaveLength(1);
    expect(outbound[0]?.formFields).toStrictEqual({
      secret: ALWAYS_PASSING_TURNSTILE_SECRET,
      response: 'widget-token',
      remoteip: '203.0.113.7',
    });
  });

  it('rejects an anonymous comment when Turnstile fails', async () => {
    stubTurnstile(false);
    const { response } = await callRoute(POST, {
      method: 'POST',
      path: '/api/comments',
      body: { pagePath: PUBLISHED_TEST_PAGE, body: 'Hi there', turnstileToken: 'bad-token' },
    });

    expect(response.status).toBe(400);
    await expect(fetchThread(await signInAdmin())).resolves.toMatchObject({
      thread: { comments: [] },
    });
  });

  it('rejects an anonymous comment without a Turnstile token before calling Turnstile', async () => {
    const outbound = stubTurnstile(true);
    const { response } = await callRoute(POST, {
      method: 'POST',
      path: '/api/comments',
      body: { pagePath: PUBLISHED_TEST_PAGE, body: 'Hi there' },
    });

    expect(response.status).toBe(400);
    expect(outbound).toHaveLength(0);
  });

  it.each(['/blog/does-not-exist/', PRIVATE_TEST_POST_PAGE])('rejects comments on %s', async (pagePath) => {
    const { response } = await callRoute(POST, {
      method: 'POST',
      path: '/api/comments',
      cookies: await signInVisitor(),
      body: { pagePath, body: 'Hello' },
    });

    expect(response.status).toBe(400);
  });

  it('rejects cross-origin submissions', async () => {
    const { response } = await callRoute(POST, {
      method: 'POST',
      path: '/api/comments',
      sameOrigin: false,
      cookies: await signInVisitor(),
      body: { pagePath: PUBLISHED_TEST_PAGE, body: 'Hello' },
    });

    expect(response.status).toBe(403);
  });

  it('rejects malformed JSON', async () => {
    const { response } = await callRoute(POST, { method: 'POST', path: '/api/comments', body: '{not json' });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toStrictEqual({ error: 'Request body must be a JSON object.' });
  });
});
