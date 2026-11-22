import type { PublicViewer } from '../auth/session-user';

export type CommentStatus = 'published' | 'pending';
export type CommentAuthorKind = 'github' | 'anonymous';

export interface PublicComment {
  id: string;
  pagePath: string;
  body: string;
  authorKind: CommentAuthorKind;
  authorName: string;
  githubLogin: string | null;
  githubAvatarUrl: string | null;
  status: CommentStatus;
  createdAt: string;
}

export interface CommentThreadResponse {
  comments: PublicComment[];
  viewer: PublicViewer | null;
}

export interface CreateCommentResponse {
  comment: PublicComment;
}
