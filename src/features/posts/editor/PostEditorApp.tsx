import { useCallback, useState } from 'react';
import { describeError } from '../../http/describe-error';
import type { PostSubmission } from '../post-types';
import { editPostUrl } from '../post-view';
import { renderMarkdownInBrowser } from './load-post-renderer';
import { describePostPathProblem } from './path/describe-post-path-problem';
import { pathFollowingTitle, pathWithCategory, pathWithSlug } from './path/post-path-changes';
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
import { PostEditorToolbar } from './PostEditorToolbar';
import { LiveMarkdownEditor } from './live-markdown/LiveMarkdownEditor';
import { PostPreview } from './PostPreview';
import { PostSettings } from './settings/PostSettings';
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

const LINE_BREAKS = /[\r\n]+/g;

function withoutLineBreaks(text: string): string {
  return text.replace(LINE_BREAKS, ' ');
}

const MARKDOWN_PLACEHOLDER = 'Start writing. Markdown renders as you type: $…$ for math, ```mermaid for diagrams.';

export default function PostEditorApp({ initialPost }: PostEditorAppProps) {
  const [savedPost, setSavedPost] = useState(initialPost);
  const [savedDraft, setSavedDraft] = useState(() => (initialPost ? draftFromPost(initialPost) : EMPTY_POST_DRAFT));
  const [draft, setDraft] = useState(savedDraft);
  const [activity, setActivity] = useState<EditorActivity>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('write');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slugFollowsTitle, setSlugFollowsTitle] = useState(initialPost === null);
  const [showsPathProblem, setShowsPathProblem] = useState(false);

  const hasUnsavedChanges = !isSameDraft(draft, savedDraft);
  const isBusy = activity !== 'idle';
  const pathProblem = showsPathProblem ? describePostPathProblem(draft.path.trim()) : null;
  useUnsavedChangesWarning(hasUnsavedChanges);
  const navigateAfterRender = useNavigationAfterRender();

  function updateDraft(changes: Partial<PostDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function updateTitle(title: string) {
    setDraft((current) => ({
      ...current,
      title,
      path: slugFollowsTitle ? pathFollowingTitle(current.path, title) : current.path,
    }));
  }

  function updateCategory(category: string) {
    setDraft((current) => ({ ...current, path: pathWithCategory(current.path, category) }));
  }

  function updateSlug(slug: string) {
    setSlugFollowsTitle(false);
    setDraft((current) => ({ ...current, path: pathWithSlug(current.path, slug) }));
  }

  const updateBodyMarkdown = useCallback((bodyMarkdown: string) => {
    setDraft((current) => ({ ...current, bodyMarkdown }));
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
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
    if (describePostPathProblem(draft.path.trim())) {
      setShowsPathProblem(true);
      setIsSettingsOpen(true);
      return;
    }
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
    <div className="post-editor" data-settings-open={isSettingsOpen}>
      <PostEditorToolbar
        statusText={hasUnsavedChanges ? 'Unsaved changes' : describeSavedPost(savedPost)}
        hasUnsavedChanges={hasUnsavedChanges}
        isPublic={draft.isPublic}
        errorMessage={errorMessage}
        isPreviewing={mode === 'preview'}
        isSettingsOpen={isSettingsOpen}
        isSaving={activity === 'saving'}
        isBusy={isBusy}
        onTogglePreview={() => {
          setMode(mode === 'write' ? 'preview' : 'write');
        }}
        onToggleSettings={() => {
          setIsSettingsOpen(!isSettingsOpen);
        }}
        onSave={() => void saveDraft()}
      />

      <div className="post-editor-sheet" hidden={mode === 'preview'}>
        <textarea
          className="post-editor-title"
          aria-label="Title"
          placeholder="Title"
          rows={1}
          value={draft.title}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
          onChange={(event) => {
            updateTitle(withoutLineBreaks(event.target.value));
          }}
        />
        <textarea
          className="post-editor-subtitle"
          aria-label="Description"
          placeholder="Add a short description…"
          rows={1}
          value={draft.description}
          onChange={(event) => {
            updateDraft({ description: event.target.value });
          }}
        />
        <LiveMarkdownEditor
          markdown={draft.bodyMarkdown}
          onMarkdownChange={updateBodyMarkdown}
          accessibleLabel="Markdown"
          placeholderText={MARKDOWN_PLACEHOLDER}
        />
      </div>
      {mode === 'preview' && <PostPreview title={draft.title} markdown={draft.bodyMarkdown} />}

      {isSettingsOpen && (
        <PostSettings
          draft={draft}
          savedPost={savedPost}
          pathProblem={pathProblem}
          isBusy={isBusy}
          onChange={updateDraft}
          onCategoryChange={updateCategory}
          onSlugChange={updateSlug}
          onConfirmedDelete={() => {
            void deleteSavedPost();
          }}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}
