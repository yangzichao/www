import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { BLOCK_MATH_NODE, INLINE_MATH_NODE } from '../syntax/math-markdown-syntax';
import {
  decorateAtxHeading,
  decorateBlockMath,
  decorateBlockquote,
  decorateFencedCode,
  decorateHorizontalRule,
  decorateListMark,
  decorateQuoteMark,
  decorateSetextHeading,
} from './block-node-decorators';
import {
  decorateEmphasis,
  decorateImage,
  decorateInlineCode,
  decorateInlineMath,
  decorateLink,
} from './inline-node-decorators';
import { LivePreviewCollector } from './live-preview-collector';

type NodeDecorator = (collector: LivePreviewCollector, node: SyntaxNode) => boolean;

const ATX_HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

const DECORATORS_BY_NODE_NAME: ReadonlyMap<string, NodeDecorator> = new Map<string, NodeDecorator>([
  ...ATX_HEADING_LEVELS.map((level): [string, NodeDecorator] => [`ATXHeading${level}`, decorateAtxHeading]),
  ['SetextHeading1', decorateSetextHeading],
  ['SetextHeading2', decorateSetextHeading],
  ['Emphasis', decorateEmphasis],
  ['StrongEmphasis', decorateEmphasis],
  ['Strikethrough', decorateEmphasis],
  ['InlineCode', decorateInlineCode],
  ['Link', decorateLink],
  ['Image', decorateImage],
  [INLINE_MATH_NODE, decorateInlineMath],
  [BLOCK_MATH_NODE, decorateBlockMath],
  ['Blockquote', decorateBlockquote],
  ['QuoteMark', decorateQuoteMark],
  ['ListMark', decorateListMark],
  ['HorizontalRule', decorateHorizontalRule],
  ['FencedCode', decorateFencedCode],
]);

export function buildLivePreviewDecorations(state: EditorState): DecorationSet {
  const collector = new LivePreviewCollector(state);
  syntaxTree(state).iterate({
    enter(nodeReference) {
      const decorate = DECORATORS_BY_NODE_NAME.get(nodeReference.name);
      return decorate ? decorate(collector, nodeReference.node) : true;
    },
  });
  return collector.toDecorationSet();
}
