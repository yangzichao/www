import type { PostHeading } from './rendering/post-heading';

export type PostTimestampPrecision = 'exact' | 'day';

export interface PostSummary {
  id: string;
  path: string;
  title: string;
  description: string | null;
  venue: string | null;
  tags: string[];
  createdAt: string;
  timestampPrecision: PostTimestampPrecision;
  updatedAt: string | null;
  isPublic: boolean;
}

export interface Post extends PostSummary {
  bodyMarkdown: string;
  bodyHtml: string;
  headings: PostHeading[];
}

export interface PostSubmission {
  path: string;
  title: string;
  description: string | null;
  venue: string | null;
  tags: string[];
  bodyMarkdown: string;
  bodyHtml: string;
  headings: PostHeading[];
  isPublic: boolean;
}

export interface PostResponse {
  post: Post;
}
