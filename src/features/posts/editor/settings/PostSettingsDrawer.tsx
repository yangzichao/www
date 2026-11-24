import { XIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface PostSettingsDrawerProps {
  onClose: () => void;
  children: ReactNode;
}

export function PostSettingsDrawer({ onClose, children }: PostSettingsDrawerProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <aside className="post-settings-drawer" aria-label="Post settings">
      <div className="post-settings-drawer-header">
        <h2>Post settings</h2>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close settings" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
      {children}
    </aside>
  );
}
