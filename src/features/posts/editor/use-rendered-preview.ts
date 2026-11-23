import { useEffect, useState } from 'react';
import { describeError } from '../../http/describe-error';
import { renderMarkdownInBrowser } from './load-post-renderer';

const PREVIEW_DEBOUNCE_MILLISECONDS = 250;

export type PreviewState =
  { kind: 'rendering' } | { kind: 'rendered'; html: string } | { kind: 'failed'; message: string };

export function useRenderedPreview(markdown: string): PreviewState {
  const [preview, setPreview] = useState<PreviewState>({ kind: 'rendering' });

  useEffect(() => {
    let isCurrent = true;
    const timer = setTimeout(() => {
      renderMarkdownInBrowser(markdown)
        .then((rendered) => {
          if (isCurrent) setPreview({ kind: 'rendered', html: rendered.html });
        })
        .catch((error: unknown) => {
          if (isCurrent) setPreview({ kind: 'failed', message: describeError(error, 'Could not render the preview.') });
        });
    }, PREVIEW_DEBOUNCE_MILLISECONDS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [markdown]);

  return preview;
}
