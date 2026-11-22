import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isPublishedPage, parsePagePath } from '../../features/site-pages/page-path';
import { recordPageView } from '../../features/page-views/page-view-store';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  if (request.headers.get('origin') !== url.origin) {
    return new Response(null, { status: 403 });
  }

  const path = parsePagePath(await request.text());
  if (!path || !(await isPublishedPage(env.ASSETS, path, url.origin))) {
    return new Response(null, { status: 400 });
  }

  const totalViews = await recordPageView(env.DB, path, new Date());
  return Response.json({ path, totalViews }, { headers: { 'cache-control': 'no-store' } });
};
