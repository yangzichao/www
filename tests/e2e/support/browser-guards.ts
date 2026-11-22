import type { BrowserContext, Page } from '@playwright/test';
import { ADMIN_SESSION, E2E_ORIGIN, VISITOR_SESSION } from './e2e-fixtures.ts';

const FAKE_TURNSTILE_SCRIPT = `
  window.turnstile = {
    render(container, options) {
      container.setAttribute('data-fake-turnstile', 'rendered');
      setTimeout(() => options.callback('e2e-turnstile-token'), 0);
      return 'fake-widget';
    },
    reset() {},
    remove() {},
  };
`;

export async function isolateFromThirdParties(context: BrowserContext): Promise<void> {
  await context.route(
    (url) => url.origin !== E2E_ORIGIN,
    async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === 'challenges.cloudflare.com') {
        await route.fulfill({ contentType: 'text/javascript', body: FAKE_TURNSTILE_SCRIPT });
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    },
  );
}

async function signInAs(context: BrowserContext, token: string): Promise<void> {
  await context.addCookies([{ name: 'session', value: token, url: E2E_ORIGIN, httpOnly: true, sameSite: 'Lax' }]);
}

export async function signInAsVisitor(context: BrowserContext): Promise<void> {
  await signInAs(context, VISITOR_SESSION.token);
}

export async function signInAsAdmin(context: BrowserContext): Promise<void> {
  await signInAs(context, ADMIN_SESSION.token);
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}
