export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64.replace(/\s/g, ''));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return base64ToBytes(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
}

export function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

export function base64ToUtf8(base64: string): string {
  return new TextDecoder().decode(base64ToBytes(base64));
}

export function randomBase64Url(byteLength: number): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}
