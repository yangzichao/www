import { vi } from 'vitest';
import type { TurnstileApi, TurnstileRenderOptions } from '../../../src/features/comments/components/turnstile-script';

export interface FakeTurnstile {
  api: TurnstileApi;
  solve: (token: string) => void;
  expire: () => void;
  reset: ReturnType<typeof vi.fn<TurnstileApi['reset']>>;
}

export function createFakeTurnstile(): FakeTurnstile {
  let renderOptions: TurnstileRenderOptions | null = null;
  const reset = vi.fn<TurnstileApi['reset']>();
  const api: TurnstileApi = {
    render: (_container, options) => {
      renderOptions = options;
      return 'widget-1';
    },
    reset,
    remove: vi.fn<TurnstileApi['remove']>(),
  };
  window.turnstile = api;
  return {
    api,
    reset,
    solve: (token) => {
      renderOptions?.callback(token);
    },
    expire: () => {
      renderOptions?.['expired-callback']();
    },
  };
}
