import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  base64ToUtf8,
  base64UrlToBytes,
  bytesToBase64,
  bytesToBase64Url,
  randomBase64Url,
  utf8ToBase64,
} from '../../../src/features/http/base64';

const BYTES_WITH_URL_UNSAFE_ALPHABET = new Uint8Array([251, 255, 191, 62]);

describe('base64 helpers', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);

    expect(base64ToBytes(bytesToBase64(bytes))).toStrictEqual(bytes);
  });

  it('ignores whitespace that GitHub inserts into base64 content', () => {
    expect(base64ToUtf8('aGVs\nbG8=\n')).toBe('hello');
  });

  it('round-trips UTF-8 text beyond Latin-1', () => {
    const text = '¹¹Be β-decay — 质子发射 🚀';

    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
  });

  it('produces URL-safe base64 without padding', () => {
    expect(bytesToBase64(BYTES_WITH_URL_UNSAFE_ALPHABET)).toBe('+/+/Pg==');
    expect(bytesToBase64Url(BYTES_WITH_URL_UNSAFE_ALPHABET)).toBe('-_-_Pg');
  });

  it.each([1, 2, 3, 4, 5])('round-trips %i bytes through base64url', (length) => {
    const bytes = new Uint8Array(length).map((_, index) => index * 37);

    expect(base64UrlToBytes(bytesToBase64Url(bytes))).toStrictEqual(bytes);
  });

  it('generates URL-safe random tokens of the requested entropy', () => {
    const token = randomBase64Url(32);

    expect(token).toMatch(/^[\w-]{43}$/);
    expect(base64UrlToBytes(token)).toHaveLength(32);
    expect(randomBase64Url(32)).not.toBe(token);
  });
});
