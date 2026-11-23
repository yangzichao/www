import { useEffect } from 'react';

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeaving);
    };
  }, [hasUnsavedChanges]);
}
