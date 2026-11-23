import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { loadCurrentUser } from '../../../features/auth/current-session';
import { toPublicViewer } from '../../../features/auth/session-user';
import { parseCommentSubmission } from '../../../features/comments/comment-input';
import { insertComment, listCommentsForPage } from '../../../features/comments/comment-store';
import type { CommentThreadResponse, CreateCommentResponse } from '../../../features/comments/comment-types';
import { verifyTurnstileToken } from '../../../features/comments/turnstile-verification';
import { jsonError, jsonNoStore } from '../../../features/http/json-responses';
import { isSameOriginRequest } from '../../../features/http/same-origin';
import { isPublishedPage, parsePagePath } from '../../../features/site-pages/page-path';
import { sitePublishedPageSources } from '../../../features/site-pages/site-published-page-sources';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const pagePath = parsePagePath(url.searchParams.get('path') ?? '');
  if (!pagePath) return jsonError(400, 'Invalid page path.');
  const viewer = await loadCurrentUser(cookies);
  const comments = await listCommentsForPage(env.DB, pagePath, { includePending: viewer?.isAdmin ?? false });
  const thread: CommentThreadResponse = { comments, viewer: toPublicViewer(viewer) };
  return jsonNoStore(thread);
};

export const POST: APIRoute = async ({ request, url, cookies, clientAddress }) => {
  if (!isSameOriginRequest(request, url)) return jsonError(403, 'Cross-origin request rejected.');

  const submission = parseCommentSubmission(await request.json().catch(() => null));
  if (typeof submission === 'string') return jsonError(400, submission);

  const pagePath = parsePagePath(submission.pagePath);
  if (!pagePath || !(await isPublishedPage(sitePublishedPageSources(), pagePath, url.origin))) {
    return jsonError(400, 'Comments are only allowed on published pages.');
  }

  const viewer = await loadCurrentUser(cookies);
  if (viewer) {
    const comment = await insertComment(env.DB, {
      pagePath,
      body: submission.body,
      authorKind: 'github',
      authorName: viewer.githubLogin,
      githubLogin: viewer.githubLogin,
      githubAvatarUrl: viewer.githubAvatarUrl,
      status: 'published',
    });
    const created: CreateCommentResponse = { comment };
    return jsonNoStore(created, 201);
  }

  const passedChallenge =
    submission.turnstileToken !== null &&
    (await verifyTurnstileToken({
      token: submission.turnstileToken,
      secretKey: env.TURNSTILE_SECRET_KEY,
      clientAddress,
    }));
  if (!passedChallenge) return jsonError(400, 'Human verification failed. Please try again.');

  const comment = await insertComment(env.DB, {
    pagePath,
    body: submission.body,
    authorKind: 'anonymous',
    authorName: submission.authorName,
    githubLogin: null,
    githubAvatarUrl: null,
    status: 'pending',
  });
  const created: CreateCommentResponse = { comment };
  return jsonNoStore(created, 201);
};
