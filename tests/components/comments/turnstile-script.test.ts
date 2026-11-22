import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TurnstileApi } from '../../../src/features/comments/components/turnstile-script';

const fakeApi: TurnstileApi = { render: () => 'widget', reset: vi.fn(), remove: vi.fn() };

function captureInjectedScripts(): HTMLScriptElement[] {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    if (node instanceof HTMLScriptElement) scripts.push(node);
    return node;
  });
  return scripts;
}

function settle(script: HTMLScriptElement | undefined, eventType: 'load' | 'error') {
  if (!script) throw new Error('Turnstile script was not injected');
  script.dispatchEvent(new Event(eventType));
}

async function freshLoader() {
  vi.resetModules();
  const { loadTurnstile } = await import('../../../src/features/comments/components/turnstile-script');
  return loadTurnstile;
}

describe('loadTurnstile', () => {
  beforeEach(() => {
    delete window.turnstile;
  });

  afterEach(() => {
    delete window.turnstile;
  });

  it('reuses an already loaded Turnstile without injecting a script', async () => {
    const scripts = captureInjectedScripts();
    window.turnstile = fakeApi;
    const loadTurnstile = await freshLoader();

    await expect(loadTurnstile()).resolves.toBe(fakeApi);
    expect(scripts).toHaveLength(0);
  });

  it('injects the explicit-render script once and resolves when it loads', async () => {
    const scripts = captureInjectedScripts();
    const loadTurnstile = await freshLoader();
    const first = loadTurnstile();
    const second = loadTurnstile();
    window.turnstile = fakeApi;
    settle(scripts[0], 'load');

    await expect(first).resolves.toBe(fakeApi);
    expect(second).toBe(first);
    expect(scripts.map((script) => [script.src, script.async])).toStrictEqual([
      ['https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', true],
    ]);
  });

  it('lets a later call retry after the script fails to load', async () => {
    const scripts = captureInjectedScripts();
    const loadTurnstile = await freshLoader();
    const failed = loadTurnstile();
    settle(scripts[0], 'error');

    await expect(failed).rejects.toThrow('Turnstile failed to load');

    const retried = loadTurnstile();
    window.turnstile = fakeApi;
    settle(scripts[1], 'load');

    await expect(retried).resolves.toBe(fakeApi);
    expect(scripts).toHaveLength(2);
  });

  it('rejects when the script loads without defining Turnstile', async () => {
    const scripts = captureInjectedScripts();
    const loadTurnstile = await freshLoader();
    const loading = loadTurnstile();
    settle(scripts[0], 'load');

    await expect(loading).rejects.toThrow('Turnstile unavailable');
  });
});
