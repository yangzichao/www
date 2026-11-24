import { splitPostTagInput } from '../../post-tags';
import type { PostDraft } from '../post-draft';

function describeTagCount(tagCount: number): string | null {
  if (tagCount === 0) return null;
  return tagCount === 1 ? '1 tag' : `${tagCount} tags`;
}

export function summarizePostSettings(draft: PostDraft): string {
  const visibility = draft.isPublic ? 'Public' : 'Private';
  const path = draft.path.trim() || 'no path yet';
  const tagCount = describeTagCount(splitPostTagInput(draft.tagInput).length);
  return [visibility, path, tagCount].filter((part) => part !== null).join(' · ');
}
