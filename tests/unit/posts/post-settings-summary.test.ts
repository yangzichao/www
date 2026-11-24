import { describe, expect, it } from 'vitest';
import { EMPTY_POST_DRAFT } from '../../../src/features/posts/editor/post-draft';
import { summarizePostSettings } from '../../../src/features/posts/editor/settings/post-settings-summary';

describe('summarizePostSettings', () => {
  it('summarizes visibility, path, and tag count', () => {
    expect(summarizePostSettings(EMPTY_POST_DRAFT)).toBe('Private · no path yet');
    expect(summarizePostSettings({ ...EMPTY_POST_DRAFT, isPublic: true, path: ' a/b ', tagInput: 'x' })).toBe(
      'Public · a/b · 1 tag',
    );
    expect(summarizePostSettings({ ...EMPTY_POST_DRAFT, tagInput: 'x, #y, x' })).toBe('Private · no path yet · 2 tags');
  });
});
