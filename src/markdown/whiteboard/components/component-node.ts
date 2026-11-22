import { sketchFill, sketchStroke, seedFor } from '../sketch/rough-sketch.ts';
import { roundCoordinate } from '../svg-markup.ts';
import { textBlockHeight, textBlockMarkup, type TextBlock } from '../text/text-markup.ts';
import { widestLineWidth } from '../text/text-measurement.ts';
import { NODE_DETAIL_TEXT, NODE_TITLE_TEXT } from '../text/text-styles.ts';
import { GLYPH_SIZE, glyphMarkup, hasGlyph } from './component-glyphs.ts';
import type { ComponentKind } from './component-kind.ts';
import { INK_COLOR, fillColorFor } from './kind-palette.ts';
import { silhouetteGeometry, type Box } from './silhouette-geometry.ts';
import { insetsFor, type Silhouette } from './silhouette.ts';

const PADDING_X = 16;
const PADDING_Y = 11;
const GLYPH_GAP = 5;
const MIN_WIDTH = 96;
const MIN_HEIGHT = 50;

export interface ComponentNodeInput {
  key: string;
  labelLines: readonly string[];
  kind: ComponentKind;
  silhouette: Silhouette;
}

export interface ComponentNode extends ComponentNodeInput {
  textBlocks: TextBlock[];
  width: number;
  height: number;
}

function textBlocksFor(labelLines: readonly string[]): TextBlock[] {
  const [title = '', ...details] = labelLines;
  const blocks: TextBlock[] = [{ lines: [title], style: NODE_TITLE_TEXT }];
  if (details.length > 0) blocks.push({ lines: details, style: NODE_DETAIL_TEXT });
  return blocks;
}

function glyphHeight(kind: ComponentKind): number {
  return hasGlyph(kind) ? GLYPH_SIZE + GLYPH_GAP : 0;
}

export function measureComponentNode(input: ComponentNodeInput): ComponentNode {
  const textBlocks = textBlocksFor(input.labelLines);
  const insets = insetsFor(input.silhouette);
  const textWidth = Math.max(...textBlocks.map((block) => widestLineWidth(block.lines, block.style)));
  const contentWidth = Math.max(textWidth, hasGlyph(input.kind) ? GLYPH_SIZE : 0);
  const contentHeight = glyphHeight(input.kind) + textBlockHeight(textBlocks);
  return {
    ...input,
    textBlocks,
    width: Math.ceil(Math.max(MIN_WIDTH, contentWidth + PADDING_X * 2 + insets.left + insets.right)),
    height: Math.ceil(Math.max(MIN_HEIGHT, contentHeight + PADDING_Y * 2 + insets.top + insets.bottom)),
  };
}

function contentBox(node: ComponentNode, box: Box): Box {
  const insets = insetsFor(node.silhouette);
  return {
    x: box.x + insets.left,
    y: box.y + insets.top,
    width: box.width - insets.left - insets.right,
    height: box.height - insets.top - insets.bottom,
  };
}

function dotMarkup(dots: readonly { x: number; y: number }[]): string {
  return dots
    .map((dot) => `<circle cx="${roundCoordinate(dot.x)}" cy="${roundCoordinate(dot.y)}" r="1.9" fill="${INK_COLOR}"/>`)
    .join('');
}

export function componentNodeMarkup(node: ComponentNode, left: number, top: number, diagramKey: string): string {
  const box: Box = { x: left, y: top, width: node.width, height: node.height };
  const geometry = silhouetteGeometry(node.silhouette, box);
  const seed = seedFor(`${diagramKey}:${node.key}`);
  const content = contentBox(node, box);
  const contentHeight = glyphHeight(node.kind) + textBlockHeight(node.textBlocks);
  const contentTop = content.y + (content.height - contentHeight) / 2;
  const centerX = content.x + content.width / 2;
  return (
    `<g class="wb-node" data-kind="${node.kind}">` +
    sketchFill(geometry.fill, { color: fillColorFor(node.kind), style: 'hachure' }, seed) +
    sketchStroke(geometry.outline, {}, seed + 1) +
    dotMarkup(geometry.dots) +
    glyphMarkup(node.kind, centerX - GLYPH_SIZE / 2, contentTop) +
    textBlockMarkup(node.textBlocks, centerX, contentTop + glyphHeight(node.kind), 'middle') +
    '</g>'
  );
}
