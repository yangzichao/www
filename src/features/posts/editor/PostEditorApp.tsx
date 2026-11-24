import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { LiveMarkdownEditor } from './live-markdown/LiveMarkdownEditor';
import { PostPreview } from './PostPreview';
import { PostSettingsPanel } from './settings/PostSettingsPanel';
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
type EditorMode = 'write' | 'preview';

const MARKDOWN_PLACEHOLDER = 'Start writing. Markdown renders as you type: $…$ for math, ```mermaid for diagrams.';

export default function PostEditorApp({ initialPost }: PostEditorAppProps) {
  const [savedPost, setSavedPost] = useState(initialPost);
  const [savedDraft, setSavedDraft] = useState(() => (initialPost ? draftFromPost(initialPost) : EMPTY_POST_DRAFT));
  const [draft, setDraft] = useState(savedDraft);
  const [activity, setActivity] = useState<EditorActivity>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('write');

  const hasUnsavedChanges = !isSameDraft(draft, savedDraft);
  const isBusy = activity !== 'idle';
  useUnsavedChangesWarning(hasUnsavedChanges);
  const navigateAfterRender = useNavigationAfterRender();

  function updateDraft(changes: Partial<PostDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  const updateBodyMarkdown = useCallback((bodyMarkdown: string) => {
    setDraft((current) => ({ ...current, bodyMarkdown }));
  }, []);

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
        <Button
          type="button"
          variant="outline"
          aria-pressed={mode === 'preview'}
          onClick={() => {
            setMode(mode === 'write' ? 'preview' : 'write');
          }}
        >
          {mode === 'write' ? 'Preview' : 'Edit'}
        </Button>
        <Button type="button" disabled={isBusy} onClick={() => void saveDraft()}>
          {activity === 'saving' ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="post-editor-sheet" hidden={mode === 'preview'}>
        <input
          className="post-editor-title"
          aria-label="Title"
          placeholder="Title"
          value={draft.title}
          onChange={(event) => {
            updateDraft({ title: event.target.value });
          }}
        />
        <PostSettingsPanel draft={draft} startsOpen={savedPost === null} onChange={updateDraft} />
        <LiveMarkdownEditor
          markdown={draft.bodyMarkdown}
          onMarkdownChange={updateBodyMarkdown}
          accessibleLabel="Markdown"
          placeholderText={MARKDOWN_PLACEHOLDER}
        />
      </div>
      {mode === 'preview' && <PostPreview title={draft.title} markdown={draft.bodyMarkdown} />}
      <p className="post-editor-hint">
        ⌘/Ctrl + S save · ⌘/Ctrl + B bold · ⌘/Ctrl + I italic · Preview shows exactly what readers will see
      </p>
    </div>
  );
}
