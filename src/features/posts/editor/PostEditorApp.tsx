import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { describeError } from '../../http/describe-error';
import { postUrl } from '../post-path';
import type { PostSubmission } from '../post-types';
import { editPostUrl } from '../post-view';
import { renderMarkdownInBrowser } from './load-post-renderer';
import {
  buildPostSubmission,
  draftFromPost,
  EMPTY_POST_DRAFT,
  isSameDraft,
  toEditablePost,
  type EditablePost,
  type PostDraft,
} from './post-draft';
import { describeSavedPost } from './post-editor-status';
import { PostDeleteButton } from './PostDeleteButton';
import { PostMetadataFields } from './PostMetadataFields';
import { PostPreview } from './PostPreview';
import { createPost, deletePostById, savePost } from './posts-api';
import { useNavigationAfterRender } from './use-navigation-after-render';
import { useSaveShortcut } from './use-save-shortcut';
import { useUnsavedChangesWarning } from './use-unsaved-changes-warning';
import './post-editor.css';

const ADMIN_HOME_URL = '/admin/';

interface PostEditorAppProps {
  initialPost: EditablePost | null;
}

type EditorActivity = 'idle' | 'saving' | 'deleting';

export default function PostEditorApp({ initialPost }: PostEditorAppProps) {
  const [savedPost, setSavedPost] = useState(initialPost);
  const [savedDraft, setSavedDraft] = useState(() => (initialPost ? draftFromPost(initialPost) : EMPTY_POST_DRAFT));
  const [draft, setDraft] = useState(savedDraft);
  const [activity, setActivity] = useState<EditorActivity>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasUnsavedChanges = !isSameDraft(draft, savedDraft);
  const isBusy = activity !== 'idle';
  useUnsavedChangesWarning(hasUnsavedChanges);
  const navigateAfterRender = useNavigationAfterRender();

  function updateDraft(changes: Partial<PostDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  async function createFromDraft(submission: PostSubmission, draftBeingSaved: PostDraft) {
    const { post } = await createPost(submission);
    setSavedDraft(draftBeingSaved);
    navigateAfterRender(editPostUrl(post.id));
  }

  async function updateFromDraft(postId: string, submission: PostSubmission, draftBeingSaved: PostDraft) {
    const { post } = await savePost(postId, submission);
    setSavedPost(toEditablePost(post));
    setSavedDraft(draftBeingSaved);
    setActivity('idle');
  }

  async function saveDraft() {
    if (isBusy) return;
    setActivity('saving');
    setErrorMessage(null);
    const draftBeingSaved = draft;
    try {
      const rendered = await renderMarkdownInBrowser(draftBeingSaved.bodyMarkdown);
      const submission = buildPostSubmission(draftBeingSaved, rendered);
      if (savedPost) await updateFromDraft(savedPost.id, submission, draftBeingSaved);
      else await createFromDraft(submission, draftBeingSaved);
    } catch (error) {
      setErrorMessage(describeError(error, 'Could not save this post.'));
      setActivity('idle');
    }
  }

  async function deleteSavedPost() {
    if (!savedPost) return;
    setActivity('deleting');
    setErrorMessage(null);
    try {
      await deletePostById(savedPost.id);
      setSavedDraft(draft);
      navigateAfterRender(ADMIN_HOME_URL);
    } catch (error) {
      setErrorMessage(describeError(error, 'Could not delete this post.'));
      setActivity('idle');
    }
  }

  useSaveShortcut(() => {
    void saveDraft();
  });

  return (
    <div className="post-editor">
      <div className="post-editor-toolbar">
        <span className="post-editor-status" data-unsaved={hasUnsavedChanges}>
          {hasUnsavedChanges ? 'Unsaved changes' : describeSavedPost(savedPost)}
        </span>
        {errorMessage && (
          <span className="post-editor-error" role="alert">
            {errorMessage}
          </span>
        )}
        {savedPost && (
          <a className="post-editor-view-link" href={postUrl(savedPost.path)} target="_blank" rel="noopener">
            View post ↗
          </a>
        )}
        {savedPost && (
          <PostDeleteButton
            disabled={isBusy}
            onConfirmedDelete={() => {
              void deleteSavedPost();
            }}
          />
        )}
        <Button type="button" disabled={isBusy} onClick={() => void saveDraft()}>
          {activity === 'saving' ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <PostMetadataFields draft={draft} onChange={updateDraft} />

      <div className="post-editor-panes">
        <Textarea
          className="post-editor-markdown"
          aria-label="Markdown"
          placeholder="Write in Markdown. Math with $…$, diagrams with ```mermaid fences."
          spellCheck
          value={draft.bodyMarkdown}
          onChange={(event) => {
            updateDraft({ bodyMarkdown: event.target.value });
          }}
        />
        <PostPreview title={draft.title} markdown={draft.bodyMarkdown} />
      </div>
      <p className="post-editor-hint">⌘/Ctrl + S to save · the preview is exactly what readers will see</p>
    </div>
  );
}
