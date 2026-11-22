import { describe, expect, it } from 'vitest';
import { describeError } from '../../../src/features/http/describe-error';
import { jsonError, jsonNoStore } from '../../../src/features/http/json-responses';
import { isSameOriginRequest } from '../../../src/features/http/same-origin';

describe('JSON responses', () => {
  it('wraps errors in an uncached JSON body', async () => {
    const response = jsonError(418, 'Short and stout');

    expect(response.status).toBe(418);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toStrictEqual({ error: 'Short and stout' });
  });

  it('defaults successful responses to 200 and never caches them', async () => {
    const response = jsonNoStore({ ok: true });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toStrictEqual({ ok: true });
  });
});

describe('isSameOriginRequest', () => {
  const pageUrl = new URL('https://zichaoyang.com/api/comments');

  it.each([
    { origin: 'https://zichaoyang.com', expected: true },
    { origin: 'https://evil.example', expected: false },
    { origin: 'http://zichaoyang.com', expected: false },
    { origin: null, expected: false },
  ])('treats origin $origin as same-origin: $expected', ({ origin, expected }) => {
    const request = new Request(pageUrl, origin ? { headers: { origin } } : {});

    expect(isSameOriginRequest(request, pageUrl)).toBe(expected);
  });
});

describe('describeError', () => {
  it('uses the message of an Error and a fallback for anything else', () => {
    expect(describeError(new Error('Boom'), 'fallback')).toBe('Boom');
    expect(describeError('not an error', 'fallback')).toBe('fallback');
  });
});
