import { describe, expect, it, vi } from 'vitest';
import { verifyTurnstileToken } from '../../../src/features/comments/turnstile-verification';

function stubSiteverify(response: Response) {
  const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

function sentForm(fetchStub: ReturnType<typeof stubSiteverify>): Record<string, FormDataEntryValue> {
  const body = fetchStub.mock.calls[0]?.[1]?.body;
  return body instanceof FormData ? Object.fromEntries(body) : {};
}

describe('verifyTurnstileToken', () => {
  it('posts the secret, token, and client address to siteverify', async () => {
    const fetchStub = stubSiteverify(Response.json({ success: true }));

    await expect(verifyTurnstileToken({ token: 't', secretKey: 's', clientAddress: '198.51.100.1' })).resolves.toBe(
      true,
    );
    expect(fetchStub.mock.calls[0]?.[0]).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(sentForm(fetchStub)).toStrictEqual({ secret: 's', response: 't', remoteip: '198.51.100.1' });
  });

  it('omits the client address when unknown', async () => {
    const fetchStub = stubSiteverify(Response.json({ success: true }));
    await verifyTurnstileToken({ token: 't', secretKey: 's', clientAddress: null });

    expect(sentForm(fetchStub)).toStrictEqual({ secret: 's', response: 't' });
  });

  it.each([
    { name: 'a failed challenge', response: Response.json({ success: false }) },
    { name: 'an outage', response: new Response('', { status: 503 }) },
  ])('fails closed on $name', async ({ response }) => {
    stubSiteverify(response);

    await expect(verifyTurnstileToken({ token: 't', secretKey: 's', clientAddress: null })).resolves.toBe(false);
  });
});
