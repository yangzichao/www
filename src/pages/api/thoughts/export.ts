import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rejectUnlessAdmin } from '../../../features/auth/require-admin';
import { jsonError } from '../../../features/http/json-responses';
import { buildThoughtExportFile, parseThoughtExportFormat } from '../../../features/thoughts/thought-export';
import { listThoughtsNewestFirst } from '../../../features/thoughts/thought-store';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const rejection = await rejectUnlessAdmin(cookies);
  if (rejection) return rejection;
  const format = parseThoughtExportFormat(url.searchParams.get('format'));
  if (!format) return jsonError(400, 'Export format must be markdown or json.');

  const exportFile = buildThoughtExportFile(
    await listThoughtsNewestFirst(env.DB, { includePrivate: true }),
    format,
    new Date(),
  );
  return new Response(exportFile.content, {
    headers: {
      'content-type': exportFile.contentType,
      'content-disposition': `attachment; filename="${exportFile.fileName}"`,
      'cache-control': 'no-store',
    },
  });
};
