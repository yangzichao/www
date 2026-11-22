import type { Box } from '../components/silhouette-geometry.ts';
import { roundedRectPath } from '../components/silhouette-geometry.ts';
import { textBlockMarkup } from '../text/text-markup.ts';
import type { TextStyle } from '../text/text-styles.ts';
import { arrowheadPrimitive, roundedPolylinePath, type Point } from './connector-geometry.ts';
import { sketchStroke } from './rough-sketch.ts';

export type ConnectorLine = 'solid' | 'dashed' | 'thick';

export interface ConnectorSketch {
  points: readonly Point[];
  line: ConnectorLine;
  arrowAtStart: boolean;
  arrowAtEnd: boolean;
  seed: number;
}

const LABEL_BACKGROUND_COLOR = '#fcfcfb';

function lineWidth(line: ConnectorLine): number {
  return line === 'thick' ? 2.4 : 1.4;
}

export function connectorMarkup(connector: ConnectorSketch): string {
  const { points } = connector;
  const first = points[0];
  const second = points[1];
  const last = points.at(-1);
  const beforeLast = points.at(-2);
  if (!first || !second || !last || !beforeLast) return '';
  const width = lineWidth(connector.line);
  const body = sketchStroke(
    [{ type: 'path', pathData: roundedPolylinePath(points) }],
    { width, dashed: connector.line === 'dashed', bowing: 0.5 },
    connector.seed,
  );
  const arrowheads = [
    ...(connector.arrowAtEnd ? [arrowheadPrimitive(last, beforeLast)] : []),
    ...(connector.arrowAtStart ? [arrowheadPrimitive(first, second)] : []),
  ];
  const heads = sketchStroke(arrowheads, { width, roughness: 0.6, bowing: 0 }, connector.seed + 1);
  return `<g class="wb-connector">${body}${heads}</g>`;
}

export function connectorLabelMarkup(lines: readonly string[], box: Box, style: TextStyle): string {
  const background = `<path d="${roundedRectPath(box, 4)}" fill="${LABEL_BACKGROUND_COLOR}" fill-opacity="0.94"/>`;
  const verticalPadding = (box.height - lines.length * style.lineHeightPx) / 2;
  const text = textBlockMarkup([{ lines, style }], box.x + box.width / 2, box.y + verticalPadding, 'middle');
  return `<g class="wb-connector-label">${background}${text}</g>`;
}
