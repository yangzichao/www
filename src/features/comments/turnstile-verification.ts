const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(options: {
  token: string;
  secretKey: string;
  clientAddress: string | null;
}): Promise<boolean> {
  const form = new FormData();
  form.append('secret', options.secretKey);
  form.append('response', options.token);
  if (options.clientAddress) form.append('remoteip', options.clientAddress);
  const response = await fetch(TURNSTILE_SITEVERIFY_URL, { method: 'POST', body: form });
  if (!response.ok) return false;
  const outcome = (await response.json()) as { success: boolean };
  return outcome.success;
}
