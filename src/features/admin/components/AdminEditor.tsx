import { useEffect, useMemo, useState } from 'react';
import type { PostFileSummary } from '../post-file-types';
import { AdminRequestError, fetchPostFile, fetchPostFiles, savePostFile } from './admin-api';
import { NewPostForm } from './NewPostForm';
import { PostEditor, type EditorDocument } from './PostEditor';
import { PostList } from './PostList';
import './admin.css';

interface AdminEditorProps {
  signInUrl: string;
}

function defaultCommitMessage(path: string, isNew: boolean): string {
  const name = path.split('/').slice(-2).join('/').replace(/\.md$/, '');
  return isNew ? `Add ${name}` : `Edit ${name}`;
}

export default function AdminEditor({ signInUrl }: AdminEditorProps) {
  const [posts, setPosts] = useState<PostFileSummary[]>([]);
  const [openDocument, setOpenDocument] = useState<EditorDocument | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const categories = useMemo(() => [...new Set(posts.map((post) => post.category))].sort(), [posts]);
  const existingPaths = useMemo(() => new Set(posts.map((post) => post.path)), [posts]);
  const hasUnsavedChanges = openDocument !== null && draftContent !== openDocument.content;

  function handleRequestError(error: unknown) {
    if (error instanceof AdminRequestError && error.status === 401) setNeedsSignIn(true);
    setStatusMessage(error instanceof Error ? error.message : 'Request failed.');
  }

  useEffect(() => {
    fetchPostFiles().then(setPosts).catch(handleRequestError);
  }, []);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (hasUnsavedChanges) event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  function confirmDiscardingChanges(): boolean {
    return !hasUnsavedChanges || window.confirm('Discard unsaved changes?');
  }

  function openEditorDocument(editorDocument: EditorDocument) {
    setOpenDocument(editorDocument);
    setDraftContent(editorDocument.content);
    setCommitMessage(defaultCommitMessage(editorDocument.path, editorDocument.sha === null));
    setStatusMessage(null);
  }

  async function handleSelect(path: string) {
    if (!confirmDiscardingChanges()) return;
    setIsCreating(false);
    try {
      openEditorDocument(await fetchPostFile(path));
    } catch (error) {
      handleRequestError(error);
    }
  }

  function handleCreate(draft: { path: string; content: string }) {
    setIsCreating(false);
    openEditorDocument({ path: draft.path, content: '', sha: null });
    setDraftContent(draft.content);
  }

  async function handleSave() {
    if (!openDocument || isSaving) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const saved = await savePostFile({
        path: openDocument.path,
        content: draftContent,
        sha: openDocument.sha,
        commitMessage,
      });
      const isNewPost = openDocument.sha === null;
      setOpenDocument({ path: saved.path, content: draftContent, sha: saved.sha });
      setCommitMessage(defaultCommitMessage(saved.path, false));
      if (isNewPost) {
        const [category, fileName] = saved.path.replace('src/content/blog/', '').split('/');
        setPosts((current) =>
          [...current, { path: saved.path, category, slug: fileName.replace(/\.md$/, '') }].sort((left, right) =>
            left.path.localeCompare(right.path),
          ),
        );
      }
      setStatusMessage(`Committed ${saved.commitSha.slice(0, 7)}. The site redeploys in about a minute.`);
    } catch (error) {
      handleRequestError(error);
    } finally {
      setIsSaving(false);
    }
  }

  if (needsSignIn) {
    return (
      <div className="admin-sign-in">
        <p>Your session has no repository access.</p>
        <a className="admin-primary" href={signInUrl}>
          Sign in with GitHub
        </a>
      </div>
    );
  }

  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <button
          type="button"
          className="admin-primary admin-new-button"
          onClick={() => confirmDiscardingChanges() && setIsCreating(true)}
        >
          New post
        </button>
        <PostList posts={posts} selectedPath={openDocument?.path ?? null} onSelect={handleSelect} />
      </aside>
      <main className="admin-main">
        {isCreating ? (
          <NewPostForm
            categories={categories}
            existingPaths={existingPaths}
            onCreate={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        ) : openDocument ? (
          <PostEditor
            document={openDocument}
            draftContent={draftContent}
            commitMessage={commitMessage}
            isSaving={isSaving}
            statusMessage={statusMessage}
            onDraftChange={setDraftContent}
            onCommitMessageChange={setCommitMessage}
            onSave={handleSave}
          />
        ) : (
          <p className="admin-hint">{statusMessage ?? 'Pick a post on the left, or create a new one.'}</p>
        )}
      </main>
    </div>
  );
}
