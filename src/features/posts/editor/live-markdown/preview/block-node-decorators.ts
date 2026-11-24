import type { SyntaxNode } from '@lezer/common';
import { DiagramWidget } from '../widgets/diagram-widget';
import { MathWidget } from '../widgets/math-widget';
import { BULLET_WIDGET, HORIZONTAL_RULE_WIDGET } from '../widgets/text-symbol-widget';
import type { LivePreviewCollector } from './live-preview-collector';

const DIAGRAM_FENCE_LANGUAGE = 'mermaid';
const CLOSING_MATH_FENCE_LINE = /^\s*\$+\s*$/;
const HEADING_LEVEL = /(\d)$/;

function texInsideBlockMath(blockSource: string): string {
  const linesAfterOpeningFence = blockSource.split('\n').slice(1);
  const lastLine = linesAfterOpeningFence.at(-1);
  if (lastLine !== undefined && CLOSING_MATH_FENCE_LINE.test(lastLine)) linesAfterOpeningFence.pop();
  return linesAfterOpeningFence.join('\n');
}

function headingLevelOf(node: SyntaxNode): string {
  return HEADING_LEVEL.exec(node.name)?.[1] ?? '1';
}

function hideMarkWithInnerSpace(collector: LivePreviewCollector, mark: SyntaxNode, container: SyntaxNode): void {
  const isOpeningMark = mark.from === container.from;
  if (isOpeningMark) {
    const trailingSpace = collector.characterAt(mark.to) === ' ' ? 1 : 0;
    collector.hide(mark.from, mark.to + trailingSpace);
    return;
  }
  const leadingSpace = collector.characterAt(mark.from - 1) === ' ' ? 1 : 0;
  collector.hide(mark.from - leadingSpace, mark.to);
}

export function decorateAtxHeading(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  collector.addLineClass(node.from, node.from, `cm-live-heading cm-live-heading-${headingLevelOf(node)}`);
  if (collector.selectionTouches(node.from, node.to)) return true;
  for (const mark of node.getChildren('HeaderMark')) hideMarkWithInnerSpace(collector, mark, node);
  return true;
}

export function decorateSetextHeading(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  collector.addLineClass(node.from, node.from, `cm-live-heading cm-live-heading-${headingLevelOf(node)}`);
  return true;
}

export function decorateBlockquote(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  collector.addLineClass(node.from, node.to, 'cm-live-blockquote');
  return true;
}

export function decorateQuoteMark(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  if (collector.selectionTouchesLines(node.from, node.to)) return false;
  const trailingSpace = collector.characterAt(node.to) === ' ' ? 1 : 0;
  collector.hide(node.from, node.to + trailingSpace);
  return false;
}

export function decorateListMark(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  const isBullet = node.parent?.parent?.name === 'BulletList';
  if (isBullet && !collector.selectionTouchesLines(node.from, node.to)) {
    collector.replaceInline(node.from, node.to, BULLET_WIDGET);
  }
  return false;
}

export function decorateHorizontalRule(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  if (!collector.selectionTouchesLines(node.from, node.to)) {
    collector.replaceInline(node.from, node.to, HORIZONTAL_RULE_WIDGET);
  }
  return false;
}

export function decorateFencedCode(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  const fenceLanguage = node.getChild('CodeInfo');
  const isDiagram = fenceLanguage !== null && collector.textOf(fenceLanguage).trim() === DIAGRAM_FENCE_LANGUAGE;
  if (isDiagram && !collector.selectionTouchesLines(node.from, node.to)) {
    const codeText = node.getChild('CodeText');
    collector.replaceWholeLines(node.from, node.to, new DiagramWidget(codeText ? collector.textOf(codeText) : ''));
    return false;
  }
  collector.addLineClass(node.from, node.to, 'cm-live-code-block');
  return false;
}

export function decorateBlockMath(collector: LivePreviewCollector, node: SyntaxNode): boolean {
  if (collector.selectionTouchesLines(node.from, node.to)) {
    collector.addLineClass(node.from, node.to, 'cm-live-math-block-source');
    return false;
  }
  collector.replaceWholeLines(node.from, node.to, new MathWidget(texInsideBlockMath(collector.textOf(node)), 'block'));
  return false;
}
