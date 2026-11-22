import { useCallback, useState, type SubmitEvent } from 'react';
import type { PublicViewer } from '../../auth/session-user';
import { commentSignInUrl } from '../../auth/admin-sign-in-url';
import { describeError } from '../../http/describe-error';
import { MAX_AUTHOR_NAME_LENGTH, MAX_COMMENT_BODY_LENGTH } from '../comment-limits';
import type { PublicComment } from '../comment-types';
import { postComment } from './comments-api';
import { TurnstileWidget } from './TurnstileWidget';

interface CommentFormProps {
  pagePath: string;
  viewer: PublicViewer | null;
  onPosted: (comment: PublicComment) => void;
  onSignOut: () => void;
}

export function CommentForm({ pagePath, viewer, onPosted, onSignOut }: CommentFormProps) {
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const handleTokenChange = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);
  const handleTurnstileUnavailable = useCallback(() => {
    setStatusMessage('Human verification could not load. Please try again later.');
  }, []);

  const isAnonymous = viewer === null;
  const canSubmit = body.trim().length > 0 && !isSubmitting && (!isAnonymous || turnstileToken !== null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const { comment } = await postComment({ pagePath, body, authorName, turnstileToken });
      setBody('');
      onPosted(comment);
      setStatusMessage(comment.status === 'pending' ? 'Thanks! Your comment will appear after review.' : null);
    } catch (error) {
      setStatusMessage(describeError(error, 'Could not post your comment.'));
    } finally {
      setIsSubmitting(false);
      if (isAnonymous) setTurnstileResetSignal((signal) => signal + 1);
    }
  }

  return (
    <form
      className="comment-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      {viewer ? (
        <p className="comment-identity">
          Commenting as <strong>@{viewer.login}</strong> ·{' '}
          <button type="button" className="comment-link-button" onClick={onSignOut}>
            Sign out
          </button>
        </p>
      ) : (
        <div className="comment-identity">
          <a className="comment-github-sign-in" href={commentSignInUrl(`${pagePath}#comments`)}>
            <i className="ph ph-github-logo" aria-hidden="true"></i> Sign in with GitHub
          </a>
          <span className="comment-identity-hint">or comment anonymously below (reviewed before it appears)</span>
        </div>
      )}
      {isAnonymous && (
        <input
          className="comment-input"
          type="text"
          placeholder="Name (optional)"
          aria-label="Name (optional)"
          maxLength={MAX_AUTHOR_NAME_LENGTH}
          value={authorName}
          onChange={(event) => {
            setAuthorName(event.target.value);
          }}
        />
      )}
      <textarea
        className="comment-input comment-textarea"
        placeholder="Leave a comment"
        aria-label="Comment"
        rows={4}
        maxLength={MAX_COMMENT_BODY_LENGTH}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
        }}
      />
      {isAnonymous && (
        <TurnstileWidget
          resetSignal={turnstileResetSignal}
          onTokenChange={handleTokenChange}
          onUnavailable={handleTurnstileUnavailable}
        />
      )}
      <div className="comment-form-footer">
        {statusMessage && <span className="comment-status">{statusMessage}</span>}
        <button type="submit" className="comment-submit" disabled={!canSubmit}>
          {isSubmitting ? 'Posting…' : 'Post comment'}
        </button>
      </div>
    </form>
  );
}
