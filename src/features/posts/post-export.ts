import type { Post } from './post-types';

export interface PostExportFile {
  fileName: string;
  content: string;
}

function withoutRenderedOutput(post: Post) {
  return {
    id: post.id,
    path: post.path,
    title: post.title,
    description: post.description,
    venue: post.venue,
    tags: post.tags,
    createdAt: post.createdAt,
    timestampPrecision: post.timestampPrecision,
    updatedAt: post.updatedAt,
    isPublic: post.isPublic,
    bodyMarkdown: post.bodyMarkdown,
  };
}

export function buildPostExportFile(posts: readonly Post[], exportedAt: Date): PostExportFile {
  const exportedAtIso = exportedAt.toISOString();
  return {
    fileName: `posts-${exportedAtIso.slice(0, 10)}.json`,
    content: `${JSON.stringify({ exportedAt: exportedAtIso, posts: posts.map(withoutRenderedOutput) }, null, 2)}\n`,
  };
}
