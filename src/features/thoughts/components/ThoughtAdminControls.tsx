import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ThoughtDeleteButton from './ThoughtDeleteButton';
import { ThoughtForm, type ThoughtDraft } from './ThoughtForm';
import { patchThought } from './thoughts-api';
import { reloadPage } from './reload-page';
import './thoughts-admin.css';

interface ThoughtAdminControlsProps {
  thoughtId: string;
  body: string;
  tags: string[];
  isPublic: boolean;
}

export default function ThoughtAdminControls({ thoughtId, body, tags, isPublic }: ThoughtAdminControlsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const savedDraft: ThoughtDraft = { body, tagInput: tags.join(', '), isPublic };

  if (isEditing) {
    return (
      <div className="thought-editor" data-editing="true">
        <ThoughtForm
          initialDraft={savedDraft}
          bodyLabel="Edit thought"
          submitLabel="Save"
          submittingLabel="Saving…"
          failureMessage="Could not save this thought."
          onSubmit={async (submission) => {
            await patchThought(thoughtId, submission);
            reloadPage();
          }}
          onCancel={() => {
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="thought-admin-controls">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="thought-edit-button"
        onClick={() => {
          setIsEditing(true);
        }}
      >
        Edit
      </Button>
      <ThoughtDeleteButton thoughtId={thoughtId} />
    </div>
  );
}
