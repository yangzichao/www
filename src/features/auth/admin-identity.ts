export const ADMIN_GITHUB_USER_ID = 43016957;
export const ADMIN_GITHUB_LOGIN = 'yangzichao';

export function isAdminGitHubUser(githubUserId: number): boolean {
  return githubUserId === ADMIN_GITHUB_USER_ID;
}
