import { base64ToBytes, bytesToBase64 } from '../http/base64';

const INITIALIZATION_VECTOR_LENGTH = 12;

async function importEncryptionKey(base64Key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', base64ToBytes(base64Key), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(plainToken: string, base64Key: string): Promise<string> {
  const key = await importEncryptionKey(base64Key);
  const initializationVector = crypto.getRandomValues(new Uint8Array(INITIALIZATION_VECTOR_LENGTH));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: initializationVector },
    key,
    new TextEncoder().encode(plainToken),
  );
  const combined = new Uint8Array(INITIALIZATION_VECTOR_LENGTH + cipherBuffer.byteLength);
  combined.set(initializationVector);
  combined.set(new Uint8Array(cipherBuffer), INITIALIZATION_VECTOR_LENGTH);
  return bytesToBase64(combined);
}

export async function decryptToken(encryptedToken: string, base64Key: string): Promise<string> {
  const key = await importEncryptionKey(base64Key);
  const combined = base64ToBytes(encryptedToken);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: combined.slice(0, INITIALIZATION_VECTOR_LENGTH) },
    key,
    combined.slice(INITIALIZATION_VECTOR_LENGTH),
  );
  return new TextDecoder().decode(plainBuffer);
}
