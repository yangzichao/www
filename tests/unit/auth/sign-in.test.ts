import { describe, expect, it } from 'vitest';
import { ADMIN_GITHUB_USER_ID, isAdminGitHubUser } from '../../../src/features/auth/admin-identity';
import { adminSignInUrl, commentSignInUrl } from '../../../src/features/auth/admin-sign-in-url';
import { toPublicViewer } from '../../../src/features/auth/session-user';
import { parseSignInIntent } from '../../../src/features/auth/sign-in-intent';

describe('sign-in intent', () => {
  it('only grants the admin intent when asked for exactly', () => {
    expect(parseSignInIntent('admin')).toBe('admin');
    expect(parseSignInIntent('ADMIN')).toBe('comment');
    expect(parseSignInIntent(null)).toBe('comment');
  });
});

describe('admin identity', () => {
  it('matches the owner by immutable GitHub user id', () => {
    expect(isAdminGitHubUser(ADMIN_GITHUB_USER_ID)).toBe(true);
    expect(isAdminGitHubUser(ADMIN_GITHUB_USER_ID + 1)).toBe(false);
  });
});

describe('sign-in URLs', () => {
  it('encode the intent and return path', () => {
    expect(adminSignInUrl('/admin/comments/')).toBe('/auth/github/login?intent=admin&return_to=%2Fadmin%2Fcomments%2F');
    expect(commentSignInUrl('/blog/a/#comments')).toBe(
      '/auth/github/login?intent=comment&return_to=%2Fblog%2Fa%2F%23comments',
    );
  });
});

describe('toPublicViewer', () => {
  it('exposes only what the browser needs', () => {
    expect(
      toPublicViewer({
        githubUserId: 7,
        githubLogin: 'octo',
        githubAvatarUrl: 'https://avatars.test/7',
        isAdmin: false,
      }),
    ).toStrictEqual({ login: 'octo', avatarUrl: 'https://avatars.test/7', isAdmin: false });
    expect(toPublicViewer(null)).toBeNull();
  });
});
