import type { APIRoute } from 'astro';
import { listPostFiles } from '../../../../features/admin/github-content-api';
import { withAdminAccessToken } from '../../../../features/admin/require-admin-token';
import { jsonNoStore } from '../../../../features/http/json-responses';

export const prerender = false;

export const GET: APIRoute = ({ cookies }) =>
  withAdminAccessToken(cookies, async (accessToken) => jsonNoStore({ posts: await listPostFiles(accessToken) }));
