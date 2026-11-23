import { describe, expect, it, vi } from 'vitest';
import { isPublishedPage, parsePagePath } from '../../../src/features/site-pages/page-path';

describe('parsePagePath', () => {
  it.each(['/', '/blog/', '/blog/physics/11be-proton-emission/', '/blog/a%20b/', '/files/report.pdf'])(
    'accepts %j',
    (path) => {
      expect(parsePagePath(path)).toBe(path);
    },
  );

  it('trims surrounding whitespace', () => {
    expect(parsePagePath('  /blog/  ')).toBe('/blog/');
  });

  it.each(['', '   ', 'blog/', '/blog/../admin/', '/blog/?q=1', '/blog/#x', '/blog/<script>', `/${'a'.repeat(300)}`])(
    'rejects %j',
    (path) => {
      expect(parsePagePath(path)).toBeNull();
    },
  );
});

describe('isPublishedPage', () => {
  function sourcesWithAssetStatus(status: number, publicPostPaths: readonly string[] = []) {
    const fetchStub = vi.fn<Fetcher['fetch']>().mockResolvedValue(new Response(null, { status }));
    const assets = { fetch: fetchStub, connect: vi.fn() } satisfies Fetcher;
    const isPublicPostPath = vi.fn((postPath: string) => Promise.resolve(publicPostPaths.includes(postPath)));
    return { sources: { assets, isPublicPostPath }, fetchStub, isPublicPostPath };
  }

  it('asks the static assets with a HEAD request that does not follow redirects', async () => {
    const { sources, fetchStub } = sourcesWithAssetStatus(200);

    await expect(isPublishedPage(sources, '/notes/a/', 'https://zichaoyang.com')).resolves.toBe(true);
    expect(fetchStub).toHaveBeenCalledWith(new URL('https://zichaoyang.com/notes/a/'), {
      method: 'HEAD',
      redirect: 'manual',
    });
  });

  it.each(['/thoughts/', '/blog/'])(
    'counts the server-rendered page %s as published without asking the static assets',
    async (path) => {
      const { sources, fetchStub } = sourcesWithAssetStatus(404);

      await expect(isPublishedPage(sources, path, 'https://zichaoyang.com')).resolves.toBe(true);
      expect(fetchStub).not.toHaveBeenCalled();
    },
  );

  it('asks the post store whether a blog post path is public', async () => {
    const { sources, fetchStub, isPublicPostPath } = sourcesWithAssetStatus(200, ['physics/11be-proton-emission']);

    await expect(isPublishedPage(sources, '/blog/physics/11be-proton-emission/', 'https://site.test')).resolves.toBe(
      true,
    );
    await expect(isPublishedPage(sources, '/blog/system-design/kv-store/', 'https://site.test')).resolves.toBe(false);
    expect(isPublicPostPath.mock.calls).toStrictEqual([['physics/11be-proton-emission'], ['system-design/kv-store']]);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it.each([301, 307, 404])('treats status %i as unpublished', async (status) => {
    await expect(
      isPublishedPage(sourcesWithAssetStatus(status).sources, '/blog/a', 'https://zichaoyang.com'),
    ).resolves.toBe(false);
  });
});
