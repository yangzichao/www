import type { PostDraft } from '../post-draft';
import { PostMetadataFields } from './PostMetadataFields';
import { summarizePostSettings } from './post-settings-summary';

interface PostSettingsPanelProps {
  draft: PostDraft;
  startsOpen: boolean;
  onChange: (changes: Partial<PostDraft>) => void;
}

export function PostSettingsPanel({ draft, startsOpen, onChange }: PostSettingsPanelProps) {
  return (
    <details className="post-settings-panel" open={startsOpen}>
      <summary className="post-settings-summary">
        <span className="post-settings-label">Post settings</span>
        <span className="post-settings-overview">{summarizePostSettings(draft)}</span>
      </summary>
      <PostMetadataFields draft={draft} onChange={onChange} />
    </details>
  );
}
