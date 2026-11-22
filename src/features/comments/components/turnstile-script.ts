const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<TurnstileApi> | null = null;

function injectTurnstileScript(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    const failLoading = (message: string) => {
      script.remove();
      turnstileScriptPromise = null;
      reject(new Error(message));
    };
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else failLoading('Turnstile unavailable');
    };
    script.onerror = () => {
      failLoading('Turnstile failed to load');
    };
    document.head.appendChild(script);
  });
}

export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  turnstileScriptPromise ??= injectTurnstileScript();
  return turnstileScriptPromise;
}
