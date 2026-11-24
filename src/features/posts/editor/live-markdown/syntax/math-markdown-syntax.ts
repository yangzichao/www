import { Tag } from '@lezer/highlight';
import type { BlockContext, InlineContext, Line, MarkdownConfig } from '@lezer/markdown';

export const MATH_SOURCE_TAG = Tag.define();

export const INLINE_MATH_NODE = 'InlineMath';
export const BLOCK_MATH_NODE = 'BlockMath';

const DOLLAR_CODE = 36;
const BLOCK_OPENING_FENCE = /^(\${2,})[^$]*$/;
const BLOCK_CLOSING_FENCE = /^(\${2,})\s*$/;

function dollarRunLength(cx: InlineContext, start: number): number {
  let position = start;
  while (position < cx.end && cx.char(position) === DOLLAR_CODE) position++;
  return position - start;
}

function findClosingRun(cx: InlineContext, searchStart: number, openingLength: number): number {
  let position = searchStart;
  while (position < cx.end) {
    if (cx.char(position) !== DOLLAR_CODE) {
      position++;
      continue;
    }
    const runLength = dollarRunLength(cx, position);
    if (runLength === openingLength) return position;
    position += runLength;
  }
  return -1;
}

function parseInlineMath(cx: InlineContext, next: number, start: number): number {
  if (next !== DOLLAR_CODE || cx.char(start - 1) === DOLLAR_CODE) return -1;
  const openingLength = dollarRunLength(cx, start);
  const closingStart = findClosingRun(cx, start + openingLength, openingLength);
  if (closingStart === -1) return -1;
  return cx.addElement(cx.elt(INLINE_MATH_NODE, start, closingStart + openingLength));
}

function lineContent(line: Line): string {
  return line.text.slice(line.pos);
}

function fenceLengthOf(fencePattern: RegExp, line: Line): number {
  return fencePattern.exec(lineContent(line))?.[1]?.length ?? 0;
}

function closesBlock(line: Line, openingLength: number): boolean {
  return fenceLengthOf(BLOCK_CLOSING_FENCE, line) >= openingLength;
}

function parseBlockMath(cx: BlockContext, line: Line): boolean {
  const openingLength = fenceLengthOf(BLOCK_OPENING_FENCE, line);
  if (openingLength === 0) return false;
  const start = cx.lineStart + line.pos;
  while (cx.nextLine()) {
    if (closesBlock(line, openingLength)) {
      const end = cx.lineStart + line.text.trimEnd().length;
      cx.nextLine();
      cx.addElement(cx.elt(BLOCK_MATH_NODE, start, end));
      return true;
    }
  }
  cx.addElement(cx.elt(BLOCK_MATH_NODE, start, cx.prevLineEnd()));
  return true;
}

export const mathMarkdownSyntax: MarkdownConfig = {
  defineNodes: [
    { name: INLINE_MATH_NODE, style: MATH_SOURCE_TAG },
    { name: BLOCK_MATH_NODE, block: true, style: MATH_SOURCE_TAG },
  ],
  parseInline: [{ name: INLINE_MATH_NODE, parse: parseInlineMath, before: 'Escape' }],
  parseBlock: [{ name: BLOCK_MATH_NODE, parse: parseBlockMath, before: 'FencedCode' }],
};
