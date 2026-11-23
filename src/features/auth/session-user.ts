export interface SessionUser {
  githubUserId: number;
  githubLogin: string;
  githubAvatarUrl: string;
  isAdmin: boolean;
}

export interface PublicViewer {
  login: string;
  avatarUrl: string;
  isAdmin: boolean;
}

export function toPublicViewer(user: SessionUser | null): PublicViewer | null {
  if (!user) return null;
  return { login: user.githubLogin, avatarUrl: user.githubAvatarUrl, isAdmin: user.isAdmin };
}
