import { useEffect, useRef } from 'react';
import { turnstileSiteKeyFor } from '../turnstile-site-key';
import { loadTurnstile } from './turnstile-script';

interface TurnstileWidgetProps {
  resetSignal: number;
  onTokenChange: (token: string | null) => void;
  onUnavailable: () => void;
}

export function TurnstileWidget({ resetSignal, onTokenChange, onUnavailable }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKeyFor(location.hostname),
          callback: (token) => {
            onTokenChange(token);
          },
          'expired-callback': () => {
            onTokenChange(null);
          },
          'error-callback': () => {
            onTokenChange(null);
          },
        });
      })
      .catch(() => {
        if (!cancelled) onUnavailable();
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [onTokenChange, onUnavailable]);

  useEffect(() => {
    if (resetSignal === 0 || !widgetIdRef.current) return;
    window.turnstile?.reset(widgetIdRef.current);
    onTokenChange(null);
  }, [resetSignal, onTokenChange]);

  return <div ref={containerRef} className="comment-turnstile" />;
}
