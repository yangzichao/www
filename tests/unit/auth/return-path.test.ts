import { describe, expect, it } from 'vitest';
import { sanitizeReturnPath } from '../../../src/features/auth/return-path';

describe('sanitizeReturnPath', () => {
  it.each([
    ['/blog/physics/post/', '/blog/physics/post/'],
    ['/blog/post/?tab=1#comments', '/blog/post/?tab=1#comments'],
    ['/admin/', '/admin/'],
  ])('keeps the same-site path %j', (input, expected) => {
    expect(sanitizeReturnPath(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    'blog/post/',
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example/',
    '\\\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r\n/evil.example',
  ])('falls back to the homepage for %j', (input) => {
    expect(sanitizeReturnPath(input)).toBe('/');
  });
});
