import { useEffect, useState } from 'react';
import { navigateTo } from './navigate-to';

export function useNavigationAfterRender(): (url: string) => void {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pendingUrl !== null) navigateTo(pendingUrl);
  }, [pendingUrl]);

  return setPendingUrl;
}
