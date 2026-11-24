import { StateEffect } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { livePreviewField } from '../../../../src/features/posts/editor/live-markdown/preview/live-preview-field';
import { createLivePreviewState, describeLivePreview } from './support/describe-live-preview';

describe('livePreviewField', () => {
  it('rebuilds when the cursor moves and keeps the set for unrelated transactions', () => {
    const state = createLivePreviewState('|\n**bold**');

    expect(describeLivePreview(state)).toStrictEqual(['hide "**"', 'hide "**"']);

    const unrelated = state.update({ effects: StateEffect.define().of(null) }).state;

    expect(unrelated.field(livePreviewField)).toBe(state.field(livePreviewField));

    const movedIntoBold = state.update({ selection: { anchor: 4 } }).state;

    expect(describeLivePreview(movedIntoBold)).toStrictEqual([]);
  });

  it('rebuilds when the document changes', () => {
    const state = createLivePreviewState('x|');
    const edited = state.update({ changes: { from: 0, insert: '*it* ' } }).state;

    expect(describeLivePreview(edited)).toStrictEqual(['hide "*"', 'hide "*"']);
  });
});
