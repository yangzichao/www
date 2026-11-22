import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken } from '../../../src/features/auth/token-encryption';
import { TEST_TOKEN_ENCRYPTION_KEY } from '../../support/test-secrets';

const OTHER_KEY = 'HxwdHhsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQA=';

describe('token encryption', () => {
  it('round-trips a token', async () => {
    const encrypted = await encryptToken('gho_secret', TEST_TOKEN_ENCRYPTION_KEY);

    await expect(decryptToken(encrypted, TEST_TOKEN_ENCRYPTION_KEY)).resolves.toBe('gho_secret');
  });

  it('never stores the plain token and uses a fresh IV each time', async () => {
    const first = await encryptToken('gho_secret', TEST_TOKEN_ENCRYPTION_KEY);
    const second = await encryptToken('gho_secret', TEST_TOKEN_ENCRYPTION_KEY);

    expect(first).not.toContain('gho_secret');
    expect(first).not.toBe(second);
  });

  it('fails to decrypt with the wrong key', async () => {
    const encrypted = await encryptToken('gho_secret', TEST_TOKEN_ENCRYPTION_KEY);

    await expect(decryptToken(encrypted, OTHER_KEY)).rejects.toThrow(Error);
  });

  it('fails to decrypt tampered ciphertext', async () => {
    const encrypted = await encryptToken('gho_secret', TEST_TOKEN_ENCRYPTION_KEY);
    const tampered = `${encrypted.slice(0, -4)}AAA=`;

    await expect(decryptToken(tampered, TEST_TOKEN_ENCRYPTION_KEY)).rejects.toThrow(Error);
  });
});
