import { beforeEach, describe, expect, it } from 'vitest';
import { base64ToUtf8, utf8ToBase64 } from '../../../src/features/http/base64';
import { GET as readFile, PUT as saveFile } from '../../../src/pages/api/admin/posts/file';
import { GET as listPosts } from '../../../src/pages/api/admin/posts/index';
import { callRoute } from '../support/api-context';
import {
  ADMIN_GITHUB_ACCESS_TOKEN,
  resetDatabase,
  signInAdminWithoutRepositoryAccess,
  signInAdminWithRepositoryAccess,
} from '../support/database';
import { stubOutboundFetch, type RecordedRequest } from '../support/fetch-stub';

const POST_PATH = 'src/content/blog/physics/halo-nuclei.md';
const POST_MARKDOWN = '---\ntitle: "Halo nuclei"\n---\n\nβ-delayed proton emission.\n';

function githubApi(responder: (request: RecordedRequest) => Response) {
  return stubOutboundFetch((request) => {
    if (!request.url.startsWith('https://api.github.com/')) return new Response('unexpected', { status: 500 });
    return responder(request);
  });
}

describe('GET /api/admin/posts', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lists editable markdown posts from the repository tree, sorted by path', async () => {
    const outbound = githubApi(() =>
      Response.json({
        tree: [
          { path: 'src/content/blog/physics/zeta.md', type: 'blob' },
          { path: 'src/content/blog/ai/alpha.md', type: 'blob' },
          { path: 'src/content/blog/ai', type: 'tree' },
          { path: 'src/content/blog/top-level.md', type: 'blob' },
          { path: 'src/content/blog/ai/Not_Editable.md', type: 'blob' },
          { path: 'src/pages/index.astro', type: 'blob' },
        ],
      }),
    );
    const { response } = await callRoute(listPosts, {
      path: '/api/admin/posts',
      cookies: await signInAdminWithRepositoryAccess(),
    });

    await expect(response.json()).resolves.toStrictEqual({
      posts: [
        { path: 'src/content/blog/ai/alpha.md', category: 'ai', slug: 'alpha' },
        { path: 'src/content/blog/physics/zeta.md', category: 'physics', slug: 'zeta' },
      ],
    });
    expect(outbound[0]?.url).toBe('https://api.github.com/repos/yangzichao/www/git/trees/main?recursive=1');
    expect(outbound[0]?.headers.get('authorization')).toBe(`Bearer ${ADMIN_GITHUB_ACCESS_TOKEN}`);
  });

  it('requires a session with repository access', async () => {
    const outbound = githubApi(() => Response.json({ tree: [] }));
    const { response } = await callRoute(listPosts, {
      path: '/api/admin/posts',
      cookies: await signInAdminWithoutRepositoryAccess(),
    });

    expect(response.status).toBe(401);
    expect(outbound).toHaveLength(0);
  });

  it('passes GitHub errors through with their status', async () => {
    githubApi(() => Response.json({ message: 'Bad credentials' }, { status: 401 }));
    const { response } = await callRoute(listPosts, {
      path: '/api/admin/posts',
      cookies: await signInAdminWithRepositoryAccess(),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toStrictEqual({ error: 'Bad credentials' });
  });
});

describe('GET /api/admin/posts/file', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('decodes UTF-8 content from the contents API', async () => {
    const outbound = githubApi(() => Response.json({ content: utf8ToBase64(POST_MARKDOWN), sha: 'blob-sha' }));
    const { response } = await callRoute(readFile, {
      path: `/api/admin/posts/file?path=${encodeURIComponent(POST_PATH)}`,
      cookies: await signInAdminWithRepositoryAccess(),
    });

    await expect(response.json()).resolves.toStrictEqual({ path: POST_PATH, content: POST_MARKDOWN, sha: 'blob-sha' });
    expect(outbound[0]?.url).toBe(
      'https://api.github.com/repos/yangzichao/www/contents/src/content/blog/physics/halo-nuclei.md?ref=main',
    );
  });

  it.each(['src/pages/index.astro', '../../etc/passwd', ''])('refuses to read %j', async (path) => {
    const outbound = githubApi(() => Response.json({}));
    const { response } = await callRoute(readFile, {
      path: `/api/admin/posts/file?path=${encodeURIComponent(path)}`,
      cookies: await signInAdminWithRepositoryAccess(),
    });

    expect(response.status).toBe(400);
    expect(outbound).toHaveLength(0);
  });
});

describe('PUT /api/admin/posts/file', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  function commitResponse() {
    return Response.json({
      content: { sha: 'new-blob-sha' },
      commit: { sha: 'commit-sha', html_url: 'https://github.com/yangzichao/www/commit/commit-sha' },
    });
  }

  it('commits an edit with the previous blob sha', async () => {
    const outbound = githubApi(commitResponse);
    const { response } = await callRoute(saveFile, {
      method: 'PUT',
      path: '/api/admin/posts/file',
      cookies: await signInAdminWithRepositoryAccess(),
      body: { path: POST_PATH, content: POST_MARKDOWN, sha: 'old-blob-sha', commitMessage: '  Edit halo nuclei  ' },
    });
    const sentBody = JSON.parse(outbound[0]?.body ?? '{}') as Record<string, string>;

    await expect(response.json()).resolves.toStrictEqual({
      path: POST_PATH,
      sha: 'new-blob-sha',
      commitSha: 'commit-sha',
      commitUrl: 'https://github.com/yangzichao/www/commit/commit-sha',
    });
    expect(outbound[0]?.method).toBe('PUT');
    expect(sentBody).toStrictEqual({
      message: 'Edit halo nuclei',
      content: utf8ToBase64(POST_MARKDOWN),
      branch: 'main',
      sha: 'old-blob-sha',
    });
    expect(base64ToUtf8(sentBody.content ?? '')).toBe(POST_MARKDOWN);
  });

  it('creates a new file without a sha and falls back to a default commit message', async () => {
    const outbound = githubApi(commitResponse);
    await callRoute(saveFile, {
      method: 'PUT',
      path: '/api/admin/posts/file',
      cookies: await signInAdminWithRepositoryAccess(),
      body: { path: POST_PATH, content: POST_MARKDOWN, sha: null, commitMessage: '' },
    });
    const sentBody = JSON.parse(outbound[0]?.body ?? '{}') as Record<string, string>;

    expect(sentBody).not.toHaveProperty('sha');
    expect(sentBody.message).toBe(`Update ${POST_PATH}`);
  });

  it.each([
    { name: 'a path outside the blog', body: { path: 'src/pages/index.astro', content: 'x' } },
    { name: 'missing content', body: { path: POST_PATH } },
    { name: 'oversized content', body: { path: POST_PATH, content: 'x'.repeat(500_001) } },
    { name: 'a non-object body', body: '"just a string"' },
  ])('rejects $name', async ({ body }) => {
    const outbound = githubApi(commitResponse);
    const { response } = await callRoute(saveFile, {
      method: 'PUT',
      path: '/api/admin/posts/file',
      cookies: await signInAdminWithRepositoryAccess(),
      body,
    });

    expect(response.status).toBe(400);
    expect(outbound).toHaveLength(0);
  });

  it('rejects cross-origin saves', async () => {
    const outbound = githubApi(commitResponse);
    const { response } = await callRoute(saveFile, {
      method: 'PUT',
      path: '/api/admin/posts/file',
      sameOrigin: false,
      cookies: await signInAdminWithRepositoryAccess(),
      body: { path: POST_PATH, content: POST_MARKDOWN },
    });

    expect(response.status).toBe(403);
    expect(outbound).toHaveLength(0);
  });

  it('reports a stale sha conflict from GitHub', async () => {
    githubApi(() => Response.json({ message: 'is at abc but expected def' }, { status: 409 }));
    const { response } = await callRoute(saveFile, {
      method: 'PUT',
      path: '/api/admin/posts/file',
      cookies: await signInAdminWithRepositoryAccess(),
      body: { path: POST_PATH, content: POST_MARKDOWN, sha: 'stale' },
    });

    expect(response.status).toBe(409);
  });
});
