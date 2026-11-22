import { fileURLToPath } from 'node:url';
import { openSync, type Font } from 'fontkit';
import type { TextStyle } from './text-styles.ts';

const VIRGIL_FONT_PATH = fileURLToPath(new URL('../../../../public/fonts/Virgil.woff2', import.meta.url));
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

let virgilFont: Font | null = null;

function loadVirgilFont(): Font {
  if (virgilFont) return virgilFont;
  const opened = openSync(VIRGIL_FONT_PATH);
  if (!('unitsPerEm' in opened)) throw new Error('Virgil.woff2 must contain a single font');
  virgilFont = opened;
  return opened;
}

function isFullWidth(codePoint: number): boolean {
  return FULL_WIDTH_RANGES.some(([first, last]) => codePoint >= first && codePoint <= last);
}

function characterWidthEm(font: Font, codePoint: number): number {
  if (isFullWidth(codePoint)) return FULL_WIDTH_EM;
  if (!font.hasGlyphForCodePoint(codePoint)) return MISSING_GLYPH_EM;
  return font.glyphForCodePoint(codePoint).advanceWidth / font.unitsPerEm;
}

export function measureTextWidth(text: string, fontSizePx: number): number {
  const font = loadVirgilFont();
  let widthEm = 0;
  for (const character of text) widthEm += characterWidthEm(font, character.codePointAt(0) ?? 0);
  return widthEm * fontSizePx;
}

export function widestLineWidth(lines: readonly string[], style: TextStyle): number {
  return Math.max(0, ...lines.map((line) => measureTextWidth(line, style.fontSizePx)));
}
