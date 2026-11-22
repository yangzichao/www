import type { PublicComment } from '../../../src/features/comments/comment-types';

export const PAGE_PATH = '/blog/physics/test-post/';

export function publicComment(overrides: Partial<PublicComment> = {}): PublicComment {
  return {
    id: 'comment-1',
    pagePath: PAGE_PATH,
    body: 'Lovely explanation.',
    authorKind: 'github',
    authorName: 'octo',
    githubLogin: 'octo',
    githubAvatarUrl: 'https://avatars.githubusercontent.com/u/7?v=4',
    status: 'published',
    createdAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

export const VISITOR_VIEWER = { login: 'friendly-visitor', avatarUrl: 'https://avatars.test/v', isAdmin: false };
export const ADMIN_VIEWER = { login: 'yangzichao', avatarUrl: 'https://avatars.test/a', isAdmin: true };
