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
  function assetsReturning(status: number) {
    const fetchStub = vi.fn<Fetcher['fetch']>().mockResolvedValue(new Response(null, { status }));
    return { assets: { fetch: fetchStub, connect: vi.fn() } satisfies Fetcher, fetchStub };
  }

  it('asks the static assets with a HEAD request that does not follow redirects', async () => {
    const { assets, fetchStub } = assetsReturning(200);

    await expect(isPublishedPage(assets, '/blog/a/', 'https://zichaoyang.com')).resolves.toBe(true);
    expect(fetchStub).toHaveBeenCalledWith(new URL('https://zichaoyang.com/blog/a/'), {
      method: 'HEAD',
      redirect: 'manual',
    });
  });

  it('counts server-rendered public pages as published without asking the static assets', async () => {
    const { assets, fetchStub } = assetsReturning(404);

    await expect(isPublishedPage(assets, '/thoughts/', 'https://zichaoyang.com')).resolves.toBe(true);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it.each([301, 307, 404])('treats status %i as unpublished', async (status) => {
    await expect(isPublishedPage(assetsReturning(status).assets, '/blog/a', 'https://zichaoyang.com')).resolves.toBe(
      false,
    );
  });
});
