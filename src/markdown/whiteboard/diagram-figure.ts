import type { Box } from './components/silhouette-geometry.ts';
import { escapeXml, roundCoordinate } from './svg-markup.ts';

export type DiagramType = 'flowchart' | 'sequence';

export interface DiagramFigure {
  diagramId: string;
  type: DiagramType;
  bounds: Box;
  title: string;
  description: string;
  body: string;
}

const CANVAS_MARGIN = 20;

export function unionBounds(boxes: readonly Box[]): Box {
  if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function diagramFigureMarkup(figure: DiagramFigure): string {
  const { bounds } = figure;
  const width = Math.ceil(bounds.width + CANVAS_MARGIN * 2);
  const height = Math.ceil(bounds.height + CANVAS_MARGIN * 2);
  const viewBox = [bounds.x - CANVAS_MARGIN, bounds.y - CANVAS_MARGIN, width, height].map(roundCoordinate).join(' ');
  const titleId = `${figure.diagramId}-title`;
  const descriptionId = `${figure.diagramId}-desc`;
  return (
    `<figure class="whiteboard-diagram" data-diagram-type="${figure.type}" style="--wb-natural-width: ${width}px">` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" role="img" aria-labelledby="${titleId} ${descriptionId}">` +
    `<title id="${titleId}">${escapeXml(figure.title)}</title>` +
    `<desc id="${descriptionId}">${escapeXml(figure.description)}</desc>` +
    figure.body +
    '</svg></figure>'
  );
}
