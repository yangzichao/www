import { describe, expect, it } from 'vitest';
import { startPendingSignIn, takePendingSignIn } from '../../../src/features/auth/oauth-state-cookie';
import { clearSessionCookie, readSessionToken, writeSessionCookie } from '../../../src/features/auth/session-cookie';
import { bytesToBase64Url } from '../../../src/features/http/base64';
import { FakeCookieJar } from '../../support/fake-cookies';

function encodePendingSignIn(value: unknown): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

describe('OAuth state cookie', () => {
  it('round-trips a pending sign-in and consumes the cookie', () => {
    const jar = new FakeCookieJar();
    const started = startPendingSignIn(jar.asAstroCookies(), { intent: 'admin', returnPath: '/admin/', secure: true });

    expect(jar.writes[0]?.options).toStrictEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/auth/github',
      maxAge: 600,
    });
    expect(takePendingSignIn(jar.asAstroCookies())).toStrictEqual(started);
    expect(jar.deletions).toStrictEqual(['oauth_state']);
    expect(takePendingSignIn(jar.asAstroCookies())).toBeNull();
  });

  it('re-sanitizes the return path and intent read back from the cookie', () => {
    const jar = new FakeCookieJar({
      oauth_state: encodePendingSignIn({ state: 's', intent: 'superuser', returnPath: '//evil.example' }),
    });

    expect(takePendingSignIn(jar.asAstroCookies())).toStrictEqual({ state: 's', intent: 'comment', returnPath: '/' });
  });

  it.each([
    { name: 'garbage', cookie: '%%%not-base64%%%' },
    { name: 'JSON without a state', cookie: encodePendingSignIn({ intent: 'admin' }) },
    { name: 'non-JSON bytes', cookie: bytesToBase64Url(new Uint8Array([0xff, 0xfe])) },
  ])('rejects $name', ({ cookie }) => {
    const jar = new FakeCookieJar({ oauth_state: cookie });

    expect(takePendingSignIn(jar.asAstroCookies())).toBeNull();
    expect(jar.deletions).toStrictEqual(['oauth_state']);
  });
});

describe('session cookie', () => {
  it('writes an http-only, same-site session cookie for thirty days', () => {
    const jar = new FakeCookieJar();
    writeSessionCookie(jar.asAstroCookies(), 'token-1', false);

    expect(jar.writes).toStrictEqual([
      {
        name: 'session',
        value: 'token-1',
        options: { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 },
      },
    ]);
    expect(readSessionToken(jar.asAstroCookies())).toBe('token-1');
  });

  it('reads nothing when there is no cookie and clears it on sign-out', () => {
    const jar = new FakeCookieJar({ session: 'token-1' });
    clearSessionCookie(jar.asAstroCookies());

    expect(readSessionToken(jar.asAstroCookies())).toBeNull();
    expect(jar.deletions).toStrictEqual(['session']);
  });
});
