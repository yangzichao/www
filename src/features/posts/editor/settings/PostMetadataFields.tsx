import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { CATEGORY_ORDER } from '../../post-categories';
import { postUrl } from '../../post-path';
import { joinPostPath, splitPostPath } from '../path/post-path-parts';
import type { PostDraft } from '../post-draft';

interface PostMetadataFieldsProps {
  draft: PostDraft;
  pathProblem: string | null;
  onChange: (changes: Partial<PostDraft>) => void;
  onCategoryChange: (category: string) => void;
  onSlugChange: (slug: string) => void;
}

type VisibilityOption = 'public' | 'private';

const CATEGORY_SUGGESTIONS_ID = 'post-category-suggestions';

export function PostMetadataFields({
  draft,
  pathProblem,
  onChange,
  onCategoryChange,
  onSlugChange,
}: PostMetadataFieldsProps) {
  const { category, slug } = splitPostPath(draft.path);
  const isPathInvalid = pathProblem !== null;

  return (
    <div className="post-editor-fields">
      <Label className="post-editor-field">
        Visibility
        <NativeSelect
          value={draft.isPublic ? 'public' : 'private'}
          onChange={(event) => {
            onChange({ isPublic: (event.target.value as VisibilityOption) === 'public' });
          }}
        >
          <NativeSelectOption value="private">Private</NativeSelectOption>
          <NativeSelectOption value="public">Public</NativeSelectOption>
        </NativeSelect>
      </Label>
      <Label className="post-editor-field">
        Category
        <Input
          list={CATEGORY_SUGGESTIONS_ID}
          placeholder="physics"
          aria-invalid={isPathInvalid && category === ''}
          value={category}
          onChange={(event) => {
            onCategoryChange(event.target.value);
          }}
        />
        <datalist id={CATEGORY_SUGGESTIONS_ID}>
          {CATEGORY_ORDER.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </Label>
      <Label className="post-editor-field">
        Slug
        <Input
          placeholder="from the title"
          aria-invalid={isPathInvalid && category !== ''}
          value={slug}
          onChange={(event) => {
            onSlugChange(event.target.value);
          }}
        />
      </Label>
      {pathProblem ? (
        <p className="post-editor-field-problem" role="alert">
          {pathProblem}
        </p>
      ) : (
        <p className="post-editor-path-preview">
          {postUrl(joinPostPath({ category: category.trim() || 'category', slug: slug.trim() || 'slug' }))}
        </p>
      )}
      <Label className="post-editor-field">
        Tags
        <Input
          placeholder="comma separated"
          value={draft.tagInput}
          onChange={(event) => {
            onChange({ tagInput: event.target.value });
          }}
        />
      </Label>
      <Label className="post-editor-field">
        Venue
        <Input
          placeholder="optional"
          value={draft.venue}
          onChange={(event) => {
            onChange({ venue: event.target.value });
          }}
        />
      </Label>
    </div>
  );
}
