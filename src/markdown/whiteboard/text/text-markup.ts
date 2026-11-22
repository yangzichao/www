import { escapeXml, roundCoordinate } from '../svg-markup.ts';
import type { TextStyle } from './text-styles.ts';

export type TextAnchor = 'start' | 'middle';

export interface TextBlock {
  lines: readonly string[];
  style: TextStyle;
}

export function textBlockHeight(blocks: readonly TextBlock[]): number {
  return blocks.reduce((height, block) => height + block.lines.length * block.style.lineHeightPx, 0);
}

export function textBlockMarkup(blocks: readonly TextBlock[], x: number, top: number, anchor: TextAnchor): string {
  let lineTop = top;
  const lines: string[] = [];
  for (const block of blocks) {
    for (const line of block.lines) {
      const baseline = lineTop + block.style.lineHeightPx * 0.72;
      lines.push(
        `<text class="${block.style.className}" x="${roundCoordinate(x)}" y="${roundCoordinate(baseline)}" text-anchor="${anchor}">${escapeXml(line)}</text>`,
      );
      lineTop += block.style.lineHeightPx;
    }
  }
  return lines.join('');
}
