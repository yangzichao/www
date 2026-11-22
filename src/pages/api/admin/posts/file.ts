import type { APIRoute } from 'astro';
import { readPostFile, writePostFile } from '../../../../features/admin/github-content-api';
import { isEditablePostFilePath } from '../../../../features/admin/post-file-path';
import type { SavePostRequest } from '../../../../features/admin/post-file-types';
import { withAdminAccessToken } from '../../../../features/admin/require-admin-token';
import { jsonError, jsonNoStore } from '../../../../features/http/json-responses';
import { isSameOriginRequest } from '../../../../features/http/same-origin';

export const prerender = false;

const MAX_POST_LENGTH = 500_000;

export const GET: APIRoute = ({ url, cookies }) =>
  withAdminAccessToken(cookies, async (accessToken) => {
    const filePath = url.searchParams.get('path') ?? '';
    if (!isEditablePostFilePath(filePath)) return jsonError(400, 'Invalid post path.');
    return jsonNoStore(await readPostFile(accessToken, filePath));
  });

function parseSavePostRequest(payload: unknown): SavePostRequest | string {
  if (typeof payload !== 'object' || payload === null) return 'Request body must be a JSON object.';
  const fields = payload as Record<string, unknown>;
  if (typeof fields.path !== 'string' || !isEditablePostFilePath(fields.path)) return 'Invalid post path.';
  if (typeof fields.content !== 'string' || fields.content.length > MAX_POST_LENGTH) return 'Invalid post content.';
  const commitMessage = typeof fields.commitMessage === 'string' ? fields.commitMessage.trim() : '';
  return {
    path: fields.path,
    content: fields.content,
    sha: typeof fields.sha === 'string' && fields.sha ? fields.sha : null,
    commitMessage: commitMessage || `Update ${fields.path}`,
  };
}

export const PUT: APIRoute = async ({ request, url, cookies }) => {
  if (!isSameOriginRequest(request, url)) return jsonError(403, 'Cross-origin request rejected.');
  const saveRequest = parseSavePostRequest(await request.json().catch(() => null));
  if (typeof saveRequest === 'string') return jsonError(400, saveRequest);
  return withAdminAccessToken(cookies, async (accessToken) =>
    jsonNoStore(
      await writePostFile(accessToken, {
        filePath: saveRequest.path,
        content: saveRequest.content,
        sha: saveRequest.sha,
        commitMessage: saveRequest.commitMessage,
      }),
    ),
  );
};
