import { useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { describeError } from '../../http/describe-error';
import { MAX_THOUGHT_BODY_LENGTH } from '../thought-limits';
import { splitTagInput } from '../thought-tags';
import { postThought } from './thoughts-api';
import { reloadPage } from './reload-page';
import './thoughts-admin.css';

function isSubmitShortcut(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey);
}

export default function ThoughtComposer() {
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = body.trim().length > 0 && !isSubmitting;

  async function submitThought() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await postThought({ body, tags: splitTagInput(tagInput) });
      setBody('');
      setTagInput('');
      reloadPage();
    } catch (error) {
      setErrorMessage(describeError(error, 'Could not post this thought.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitThought();
  }

  function handleBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isSubmitShortcut(event)) return;
    event.preventDefault();
    void submitThought();
  }

  return (
    <form className="thought-composer" onSubmit={handleSubmit}>
      <Textarea
        className="thought-composer-body"
        placeholder="What's on your mind?"
        aria-label="New thought"
        rows={3}
        maxLength={MAX_THOUGHT_BODY_LENGTH}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
        }}
        onKeyDown={handleBodyKeyDown}
      />
      <div className="thought-composer-footer">
        <Input
          className="thought-composer-tags"
          type="text"
          placeholder="tags, comma separated"
          aria-label="Tags"
          value={tagInput}
          onChange={(event) => {
            setTagInput(event.target.value);
          }}
        />
        {errorMessage && (
          <span className="thought-composer-error" role="alert">
            {errorMessage}
          </span>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? 'Posting…' : 'Post'}
        </Button>
      </div>
      <p className="thought-composer-hint">Markdown supported · ⌘/Ctrl + Enter to post</p>
    </form>
  );
}
