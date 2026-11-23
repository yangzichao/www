import { splitPostTagInput } from '../post-tags';
import type { Post, PostSubmission } from '../post-types';
import type { RenderedPost } from '../rendering/render-post-markdown';

export interface EditablePost {
  id: string;
  path: string;
  title: string;
  description: string | null;
  venue: string | null;
  tags: string[];
  bodyMarkdown: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface PostDraft {
  title: string;
  path: string;
  description: string;
  venue: string;
  tagInput: string;
  bodyMarkdown: string;
  isPublic: boolean;
}

export const EMPTY_POST_DRAFT: PostDraft = {
  title: '',
  path: '',
  description: '',
  venue: '',
  tagInput: '',
  bodyMarkdown: '',
  isPublic: false,
};

export function toEditablePost(post: Post): EditablePost {
  return {
    id: post.id,
    path: post.path,
    title: post.title,
    description: post.description,
    venue: post.venue,
    tags: post.tags,
    bodyMarkdown: post.bodyMarkdown,
    isPublic: post.isPublic,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function draftFromPost(post: EditablePost): PostDraft {
  return {
    title: post.title,
    path: post.path,
    description: post.description ?? '',
    venue: post.venue ?? '',
    tagInput: post.tags.join(', '),
    bodyMarkdown: post.bodyMarkdown,
    isPublic: post.isPublic,
  };
}

export function isSameDraft(left: PostDraft, right: PostDraft): boolean {
  return (Object.keys(left) as (keyof PostDraft)[]).every((field) => left[field] === right[field]);
}

function nullIfBlank(text: string): string | null {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildPostSubmission(draft: PostDraft, rendered: RenderedPost): PostSubmission {
  return {
    path: draft.path.trim(),
    title: draft.title.trim(),
    description: nullIfBlank(draft.description),
    venue: nullIfBlank(draft.venue),
    tags: splitPostTagInput(draft.tagInput),
    bodyMarkdown: draft.bodyMarkdown,
    bodyHtml: rendered.html,
    headings: rendered.headings,
    isPublic: draft.isPublic,
  };
}
