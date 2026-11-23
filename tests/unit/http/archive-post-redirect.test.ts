import type { APIContext } from 'astro';
import { describe, expect, it } from 'vitest';
import { GET } from '../../../src/pages/archive/blog/[...path]';

function redirectResponse(location: string, status?: number): Response {
  return new Response(null, { status: status ?? 302, headers: { location } });
}

async function followArchiveUrl(params: Record<string, string>): Promise<Response> {
  const context = { params, redirect: redirectResponse } as unknown as APIContext;
  return GET(context);
}

describe('GET /archive/blog/[...path]', () => {
  it('permanently redirects an archived post to the same path under the blog', async () => {
    const response = await followArchiveUrl({ path: 'system-design/kv-store' });

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('/blog/system-design/kv-store/');
  });

  it('sends an empty archive path to the blog index', async () => {
    const response = await followArchiveUrl({});

    expect(response.headers.get('location')).toBe('/blog/');
  });
});
