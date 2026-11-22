import type { Box } from '../components/silhouette-geometry.ts';
import { widestLineWidth } from '../text/text-measurement.ts';
import { CONNECTOR_LABEL_TEXT, NOTE_TEXT } from '../text/text-styles.ts';

export const ROW_GAP = 22;
export const LABEL_GAP = 4;
export const SELF_LOOP_WIDTH = 36;
export const SELF_LOOP_MIN_HEIGHT = 24;
export const SELF_LABEL_OFFSET = 8;
export const NOTE_PADDING_X = 12;
export const NOTE_PADDING_Y = 9;
export const NOTE_SPAN_OVERHANG = 28;
export const NOTE_SIDE_GAP = 10;
export const NOTE_MIN_WIDTH = 80;
const LABEL_PADDING_X = 6;
const LABEL_PADDING_Y = 2;
const LABEL_CLEARANCE = 24;

export interface Size {
  width: number;
  height: number;
}

export function messageLabelSize(labelLines: readonly string[]): Size {
  if (labelLines.length === 0) return { width: 0, height: 0 };
  return {
    width: widestLineWidth(labelLines, CONNECTOR_LABEL_TEXT) + LABEL_PADDING_X * 2,
    height: labelLines.length * CONNECTOR_LABEL_TEXT.lineHeightPx + LABEL_PADDING_Y * 2,
  };
}

export function messageSpanWidth(labelLines: readonly string[]): number {
  return messageLabelSize(labelLines).width + LABEL_CLEARANCE;
}

export function selfMessageWidth(labelLines: readonly string[]): number {
  return SELF_LOOP_WIDTH + SELF_LABEL_OFFSET + messageLabelSize(labelLines).width + LABEL_CLEARANCE / 2;
}

export function noteSize(labelLines: readonly string[]): Size {
  return {
    width: Math.max(NOTE_MIN_WIDTH, widestLineWidth(labelLines, NOTE_TEXT) + NOTE_PADDING_X * 2),
    height: labelLines.length * NOTE_TEXT.lineHeightPx + NOTE_PADDING_Y * 2,
  };
}

export function sizedBox(x: number, y: number, size: Size): Box {
  return { x, y, width: size.width, height: size.height };
}
