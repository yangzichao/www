import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rejectUnlessAdmin } from '../../../features/auth/require-admin';
import { buildPostExportFile } from '../../../features/posts/post-export';
import { listPostsWithBodies } from '../../../features/posts/store/post-store';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const rejection = await rejectUnlessAdmin(cookies);
  if (rejection) return rejection;
  const exportFile = buildPostExportFile(await listPostsWithBodies(env.DB), new Date());
  return new Response(exportFile.content, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${exportFile.fileName}"`,
      'cache-control': 'no-store',
    },
  });
};
