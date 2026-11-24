import type { SyntaxNode } from '@lezer/common';
import { MathWidget } from '../widgets/math-widget';
import { ImageWidget } from '../widgets/image-widget';
import type { LivePreviewCollector } from './live-preview-collector';

const EMPHASIS_MARKS = new Set(['EmphasisMark', 'StrikethroughMark']);
const LINK_MARKUP = new Set(['LinkMark', 'URL', 'LinkTitle', 'LinkLabel']);
const CODE_MARKS = new Set(['CodeMark']);
const INLINE_MATH_DELIMITER = /^\$+|\$+$/g;
const IMAGE_ALT_TEXT = /^!\[([^\]]*)\]/;

export function decorateEmphasis(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  if (!collector.selectionTouches(node.from, node.to)) collector.hideChildren(node, EMPHASIS_MARKS);
  return true;
}

export function decorateInlineCode(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  collector.markText(node.from, node.to, 'cm-live-inline-code');
  if (!collector.selectionTouches(node.from, node.to)) collector.hideChildren(node, CODE_MARKS);
  return false;
}

export function decorateLink(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  if (!collector.selectionTouches(node.from, node.to)) collector.hideChildren(node, LINK_MARKUP);
  return true;
}

export function decorateImage(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  const urlNode = node.getChild('URL');
  if (!urlNode || collector.selectionTouches(node.from, node.to)) return false;
  const altText = IMAGE_ALT_TEXT.exec(collector.textOf(node))?.[1] ?? '';
  collector.replaceInline(node.from, node.to, new ImageWidget(collector.textOf(urlNode), altText));
  return false;
}

export function decorateInlineMath(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  if (collector.selectionTouches(node.from, node.to)) return false;
  const texSource = collector.textOf(node).replace(INLINE_MATH_DELIMITER, '');
  collector.replaceInline(node.from, node.to, new MathWidget(texSource, 'inline'));
  return false;
}
