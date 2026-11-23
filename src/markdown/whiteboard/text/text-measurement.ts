import type { TextStyle } from './text-styles.ts';
import { VIRGIL_ADVANCE_WIDTHS, VIRGIL_UNITS_PER_EM } from './virgil-advance-widths.generated.ts';

const FULL_WIDTH_EM = 1;
const MISSING_GLYPH_EM = 0.6;

const FULL_WIDTH_RANGES: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
];

function isFullWidth(codePoint: number): boolean {
  return FULL_WIDTH_RANGES.some(([first, last]) => codePoint >= first && codePoint <= last);
}

function characterWidthEm(codePoint: number): number {
  if (isFullWidth(codePoint)) return FULL_WIDTH_EM;
  const advanceWidth = VIRGIL_ADVANCE_WIDTHS.get(codePoint);
  return advanceWidth === undefined ? MISSING_GLYPH_EM : advanceWidth / VIRGIL_UNITS_PER_EM;
}

export function measureTextWidth(text: string, fontSizePx: number): number {
  let widthEm = 0;
  for (const character of text) widthEm += characterWidthEm(character.codePointAt(0) ?? 0);
  return widthEm * fontSizePx;
}

export function widestLineWidth(lines: readonly string[], style: TextStyle): number {
  return Math.max(0, ...lines.map((line) => measureTextWidth(line, style.fontSizePx)));
}
