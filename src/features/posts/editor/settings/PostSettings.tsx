import { postUrl } from '../../post-path';
import type { EditablePost, PostDraft } from '../post-draft';
import { PostDeleteButton } from './PostDeleteButton';
import { PostMetadataFields } from './PostMetadataFields';
import { PostSettingsDrawer } from './PostSettingsDrawer';

interface PostSettingsProps {
  draft: PostDraft;
  savedPost: EditablePost | null;
  pathProblem: string | null;
  isBusy: boolean;
  onChange: (changes: Partial<PostDraft>) => void;
  onCategoryChange: (category: string) => void;
  onSlugChange: (slug: string) => void;
  onConfirmedDelete: () => void;
  onClose: () => void;
}

export function PostSettings({
  draft,
  savedPost,
  pathProblem,
  isBusy,
  onChange,
  onCategoryChange,
  onSlugChange,
  onConfirmedDelete,
  onClose,
}: PostSettingsProps) {
  return (
    <PostSettingsDrawer onClose={onClose}>
      <PostMetadataFields
        draft={draft}
        pathProblem={pathProblem}
        onChange={onChange}
        onCategoryChange={onCategoryChange}
        onSlugChange={onSlugChange}
      />
      {savedPost && (
        <div className="post-settings-footer">
          <a className="post-editor-view-link" href={postUrl(savedPost.path)} target="_blank" rel="noopener">
            View post ↗
          </a>
          <PostDeleteButton disabled={isBusy} onConfirmedDelete={onConfirmedDelete} />
        </div>
      )}
    </PostSettingsDrawer>
  );
}
