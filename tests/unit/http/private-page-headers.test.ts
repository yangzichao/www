import { describe, expect, it } from 'vitest';
import { markAsPrivatePage, privateNotFoundResponse } from '../../../src/features/http/private-page-headers';

describe('private page headers', () => {
  it('keeps private pages out of caches and search indexes', () => {
    const headers = new Headers({ 'cache-control': 'public, max-age=60' });
    markAsPrivatePage(headers);

    expect([headers.get('cache-control'), headers.get('x-robots-tag')]).toStrictEqual([
      'no-store',
      'noindex, nofollow',
    ]);
  });

  it('answers unknown private pages with an uncached 404', async () => {
    const response = privateNotFoundResponse();

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.text()).resolves.toBe('Not found');
  });
});
