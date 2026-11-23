import { useEffect, useEffectEvent } from 'react';

function isSaveShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
}

export function useSaveShortcut(onSave: () => void): void {
  const saveFromShortcut = useEffectEvent(onSave);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isSaveShortcut(event)) return;
      event.preventDefault();
      saveFromShortcut();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
