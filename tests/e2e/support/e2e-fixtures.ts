const E2E_PORT = 8790;
export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;
export const E2E_PERSIST_DIRECTORY = '.wrangler/e2e-state';

export const COMMENT_TEST_PAGE = '/blog/physics/11be-proton-emission/';

export const VISITOR_SESSION = {
  token: 'e2e-visitor-session-token',
  githubUserId: 5001,
  githubLogin: 'e2e-visitor',
  avatarUrl: 'https://avatars.githubusercontent.com/u/5001?v=4',
};

export const ADMIN_SESSION = {
  token: 'e2e-admin-session-token',
  githubUserId: 43016957,
  githubLogin: 'yangzichao',
  avatarUrl: 'https://avatars.githubusercontent.com/u/43016957?v=4',
};

export const SEEDED_PENDING_COMMENT = {
  id: 'e2e-pending-comment',
  body: 'Seeded anonymous comment awaiting review.',
  authorName: 'E2E Reader',
};
