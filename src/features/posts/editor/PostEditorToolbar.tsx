import { ArrowLeftIcon, Settings2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ADMIN_POSTS_URL = '/admin/';

interface PostEditorToolbarProps {
  statusText: string;
  hasUnsavedChanges: boolean;
  isPublic: boolean;
  errorMessage: string | null;
  isPreviewing: boolean;
  isSettingsOpen: boolean;
  isSaving: boolean;
  isBusy: boolean;
  onTogglePreview: () => void;
  onToggleSettings: () => void;
  onSave: () => void;
}

export function PostEditorToolbar({
  statusText,
  hasUnsavedChanges,
  isPublic,
  errorMessage,
  isPreviewing,
  isSettingsOpen,
  isSaving,
  isBusy,
  onTogglePreview,
  onToggleSettings,
  onSave,
}: PostEditorToolbarProps) {
  return (
    <div className="post-editor-toolbar">
      <a className="post-editor-back-link" href={ADMIN_POSTS_URL}>
        <ArrowLeftIcon aria-hidden="true" />
        Posts
      </a>
      <span className="post-editor-visibility" data-public={isPublic}>
        {isPublic ? 'Public' : 'Private'}
      </span>
      <span className="post-editor-status" data-unsaved={hasUnsavedChanges}>
        {statusText}
      </span>
      {errorMessage && (
        <span className="post-editor-error" role="alert">
          {errorMessage}
        </span>
      )}
      <div className="post-editor-actions">
        <Button type="button" variant="ghost" aria-pressed={isPreviewing} onClick={onTogglePreview}>
          {isPreviewing ? 'Edit' : 'Preview'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Settings"
          aria-expanded={isSettingsOpen}
          onClick={onToggleSettings}
        >
          <Settings2Icon />
        </Button>
        <Button type="button" disabled={isBusy} title="⌘/Ctrl + S" onClick={onSave}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
