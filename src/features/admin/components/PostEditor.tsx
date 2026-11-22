import { useEffect, useEffectEvent } from 'react';
import { publicUrlForPostFile } from '../post-file-path';

export interface EditorDocument {
  path: string;
  content: string;
  sha: string | null;
}

interface PostEditorProps {
  document: EditorDocument;
  draftContent: string;
  commitMessage: string;
  isSaving: boolean;
  statusMessage: string | null;
  onDraftChange: (content: string) => void;
  onCommitMessageChange: (message: string) => void;
  onSave: () => void;
}

export function PostEditor({
  document: editorDocument,
  draftContent,
  commitMessage,
  isSaving,
  statusMessage,
  onDraftChange,
  onCommitMessageChange,
  onSave,
}: PostEditorProps) {
  const hasUnsavedChanges = draftContent !== editorDocument.content;
  const saveFromShortcut = useEffectEvent(onSave);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveFromShortcut();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="admin-editor">
      <div className="admin-editor-toolbar">
        <code className="admin-editor-path">{editorDocument.path}</code>
        {editorDocument.sha && (
          <a href={publicUrlForPostFile(editorDocument.path)} target="_blank" rel="noopener">
            View live ↗
          </a>
        )}
      </div>
      <textarea
        className="admin-editor-textarea"
        aria-label="Post markdown"
        value={draftContent}
        spellCheck={false}
        onChange={(event) => {
          onDraftChange(event.target.value);
        }}
      />
      <div className="admin-editor-footer">
        <input
          className="admin-commit-message"
          value={commitMessage}
          placeholder="Commit message"
          aria-label="Commit message"
          onChange={(event) => {
            onCommitMessageChange(event.target.value);
          }}
        />
        <button
          type="button"
          className="admin-primary"
          disabled={isSaving || (!hasUnsavedChanges && editorDocument.sha !== null)}
          onClick={onSave}
        >
          {isSaving ? 'Committing…' : 'Commit (⌘S)'}
        </button>
      </div>
      {statusMessage && <p className="admin-hint">{statusMessage}</p>}
    </div>
  );
}
