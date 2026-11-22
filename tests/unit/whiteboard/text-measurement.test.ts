import { describe, expect, it } from 'vitest';
import { splitLabelLines } from '../../../src/markdown/whiteboard/text/label-lines';
import { measureTextWidth, widestLineWidth } from '../../../src/markdown/whiteboard/text/text-measurement';
import { NODE_TITLE_TEXT } from '../../../src/markdown/whiteboard/text/text-styles';

describe('measureTextWidth', () => {
  it('measures Latin text with the Virgil advance widths', () => {
    const width = measureTextWidth('Load balancer', 15);

    expect(width).toBeGreaterThan(80);
    expect(width).toBeLessThan(140);
    expect(measureTextWidth('Load balancer', 30)).toBeCloseTo(width * 2, 6);
  });

  it('counts CJK and full-width characters as one em', () => {
    expect(measureTextWidth('负载均衡', 15)).toBe(60);
    expect(measureTextWidth('ＡＢ', 10)).toBe(20);
  });

  it('counts characters Virgil cannot draw as 0.6 em', () => {
    expect(measureTextWidth('\u{1F680}', 10)).toBeCloseTo(6, 6);
  });

  it('reports the widest line, or zero for no lines', () => {
    expect(widestLineWidth(['a', 'abc'], NODE_TITLE_TEXT)).toBe(measureTextWidth('abc', NODE_TITLE_TEXT.fontSizePx));
    expect(widestLineWidth([], NODE_TITLE_TEXT)).toBe(0);
  });
});

describe('splitLabelLines', () => {
  it('strips surrounding quotes, splits on <br> variants and drops empty lines', () => {
    expect(splitLabelLines('  "a<br/>b <BR> c<br>"  ')).toStrictEqual(['a', 'b', 'c']);
    expect(splitLabelLines('"')).toStrictEqual(['"']);
    expect(splitLabelLines('<br/>')).toStrictEqual([]);
  });
});
