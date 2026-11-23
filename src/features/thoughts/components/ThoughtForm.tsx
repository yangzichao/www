import { useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { describeError } from '../../http/describe-error';
import { MAX_THOUGHT_BODY_LENGTH } from '../thought-limits';
import { splitTagInput } from '../thought-tags';
import type { ThoughtSubmission } from '../thought-types';
import './thoughts-admin.css';

export interface ThoughtDraft {
  body: string;
  tagInput: string;
  isPublic: boolean;
}

export const EMPTY_THOUGHT_DRAFT: ThoughtDraft = { body: '', tagInput: '', isPublic: true };

interface ThoughtFormProps {
  initialDraft: ThoughtDraft;
  bodyLabel: string;
  submitLabel: string;
  submittingLabel: string;
  failureMessage: string;
  clearAfterSubmit?: boolean;
  onSubmit: (submission: ThoughtSubmission) => Promise<void>;
  onCancel?: () => void;
}

type VisibilityOption = 'public' | 'private';

function isSubmitShortcut(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey);
}

export function ThoughtForm({
  initialDraft,
  bodyLabel,
  submitLabel,
  submittingLabel,
  failureMessage,
  clearAfterSubmit = false,
  onSubmit,
  onCancel,
}: ThoughtFormProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = draft.body.trim().length > 0 && !isSubmitting;

  function updateDraft(changes: Partial<ThoughtDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  async function submitDraft() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({ body: draft.body, tags: splitTagInput(draft.tagInput), isPublic: draft.isPublic });
      if (clearAfterSubmit) setDraft(EMPTY_THOUGHT_DRAFT);
    } catch (error) {
      setErrorMessage(describeError(error, failureMessage));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitDraft();
  }

  function handleBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isSubmitShortcut(event)) return;
    event.preventDefault();
    void submitDraft();
  }

  return (
    <form className="thought-form" onSubmit={handleSubmit}>
      <Textarea
        className="thought-form-body"
        placeholder="What's on your mind?"
        aria-label={bodyLabel}
        rows={3}
        maxLength={MAX_THOUGHT_BODY_LENGTH}
        value={draft.body}
        onChange={(event) => {
          updateDraft({ body: event.target.value });
        }}
        onKeyDown={handleBodyKeyDown}
      />
      <div className="thought-form-footer">
        <Input
          className="thought-form-tags"
          type="text"
          placeholder="tags, comma separated"
          aria-label="Tags"
          value={draft.tagInput}
          onChange={(event) => {
            updateDraft({ tagInput: event.target.value });
          }}
        />
        <NativeSelect
          aria-label="Visibility"
          value={draft.isPublic ? 'public' : 'private'}
          onChange={(event) => {
            updateDraft({ isPublic: (event.target.value as VisibilityOption) === 'public' });
          }}
        >
          <NativeSelectOption value="public">Public</NativeSelectOption>
          <NativeSelectOption value="private">Private</NativeSelectOption>
        </NativeSelect>
        {errorMessage && (
          <span className="thought-form-error" role="alert">
            {errorMessage}
          </span>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
      <p className="thought-form-hint">Markdown supported · ⌘/Ctrl + Enter to {submitLabel.toLowerCase()}</p>
    </form>
  );
}
