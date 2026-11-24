import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { PostDraft } from '../post-draft';

interface PostMetadataFieldsProps {
  draft: PostDraft;
  onChange: (changes: Partial<PostDraft>) => void;
}

type VisibilityOption = 'public' | 'private';

export function PostMetadataFields({ draft, onChange }: PostMetadataFieldsProps) {
  return (
    <div className="post-editor-fields">
      <div className="post-editor-field-grid">
        <Label className="post-editor-field">
          Path
          <Input
            placeholder="category/slug"
            value={draft.path}
            onChange={(event) => {
              onChange({ path: event.target.value });
            }}
          />
        </Label>
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
      </div>
      <Label className="post-editor-field">
        Description
        <Input
          placeholder="One or two sentences shown in the post list"
          value={draft.description}
          onChange={(event) => {
            onChange({ description: event.target.value });
          }}
        />
      </Label>
    </div>
  );
}
