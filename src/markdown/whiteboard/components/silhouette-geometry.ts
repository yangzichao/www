import { roundCoordinate as r } from '../svg-markup.ts';
import type { Silhouette } from './silhouette.ts';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ShapePrimitive =
  | { type: 'path'; pathData: string }
  | { type: 'ellipse'; centerX: number; centerY: number; width: number; height: number };

export interface SilhouetteGeometry {
  fill: ShapePrimitive[];
  outline: ShapePrimitive[];
  dots: { x: number; y: number }[];
}

const STACK_OFFSET = 7;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function path(pathData: string): ShapePrimitive {
  return { type: 'path', pathData };
}

function line(fromX: number, fromY: number, toX: number, toY: number): ShapePrimitive {
  return path(`M ${r(fromX)} ${r(fromY)} L ${r(toX)} ${r(toY)}`);
}

export function roundedRectPath({ x, y, width, height }: Box, radius: number): string {
  const corner = Math.min(radius, width / 2, height / 2);
  return (
    `M ${r(x + corner)} ${r(y)} L ${r(x + width - corner)} ${r(y)} ` +
    `Q ${r(x + width)} ${r(y)} ${r(x + width)} ${r(y + corner)} ` +
    `L ${r(x + width)} ${r(y + height - corner)} ` +
    `Q ${r(x + width)} ${r(y + height)} ${r(x + width - corner)} ${r(y + height)} ` +
    `L ${r(x + corner)} ${r(y + height)} Q ${r(x)} ${r(y + height)} ${r(x)} ${r(y + height - corner)} ` +
    `L ${r(x)} ${r(y + corner)} Q ${r(x)} ${r(y)} ${r(x + corner)} ${r(y)} Z`
  );
}

function cylinderRimRadius(box: Box): number {
  return clamp(box.height * 0.14, 7, 10);
}

function cylinderBodyPath(box: Box): string {
  const { x, y, width, height } = box;
  const rimRadius = cylinderRimRadius(box);
  const top = y + rimRadius;
  const bottom = y + height - rimRadius;
  return (
    `M ${r(x)} ${r(top)} L ${r(x)} ${r(bottom)} ` +
    `A ${r(width / 2)} ${r(rimRadius)} 0 0 0 ${r(x + width)} ${r(bottom)} ` +
    `L ${r(x + width)} ${r(top)} A ${r(width / 2)} ${r(rimRadius)} 0 0 0 ${r(x)} ${r(top)} Z`
  );
}

function bucketBodyPath(box: Box): string {
  const { x, y, width, height } = box;
  const rimRadius = clamp(height * 0.12, 6, 9);
  const top = y + rimRadius;
  const inset = width * 0.08;
  return (
    `M ${r(x)} ${r(top)} L ${r(x + inset)} ${r(y + height - rimRadius)} ` +
    `A ${r(width / 2 - inset)} ${r(rimRadius)} 0 0 0 ${r(x + width - inset)} ${r(y + height - rimRadius)} ` +
    `L ${r(x + width)} ${r(top)} A ${r(width / 2)} ${r(rimRadius)} 0 0 0 ${r(x)} ${r(top)} Z`
  );
}

function cloudPath({ x, y, width, height }: Box): string {
  const base = y + height - 6;
  return (
    `M ${r(x + width * 0.2)} ${r(base)} ` +
    `C ${r(x - 4)} ${r(base)} ${r(x - 4)} ${r(y + height * 0.42)} ${r(x + width * 0.15)} ${r(y + height * 0.4)} ` +
    `C ${r(x + width * 0.15)} ${r(y + 2)} ${r(x + width * 0.48)} ${r(y - 6)} ${r(x + width * 0.55)} ${r(y + height * 0.22)} ` +
    `C ${r(x + width * 0.72)} ${r(y)} ${r(x + width + 4)} ${r(y + 4)} ${r(x + width * 0.87)} ${r(y + height * 0.44)} ` +
    `C ${r(x + width + 6)} ${r(y + height * 0.5)} ${r(x + width + 4)} ${r(base)} ${r(x + width * 0.8)} ${r(base)} Z`
  );
}

function hexagonPath({ x, y, width, height }: Box): string {
  const point = Math.min(18, width / 4);
  return (
    `M ${r(x + point)} ${r(y)} L ${r(x + width - point)} ${r(y)} L ${r(x + width)} ${r(y + height / 2)} ` +
    `L ${r(x + width - point)} ${r(y + height)} L ${r(x + point)} ${r(y + height)} L ${r(x)} ${r(y + height / 2)} Z`
  );
}

function diamondPath({ x, y, width, height }: Box): string {
  return (
    `M ${r(x + width / 2)} ${r(y)} L ${r(x + width)} ${r(y + height / 2)} ` +
    `L ${r(x + width / 2)} ${r(y + height)} L ${r(x)} ${r(y + height / 2)} Z`
  );
}

function stackedGeometry(box: Box): SilhouetteGeometry {
  const front = { ...box, width: box.width - STACK_OFFSET, height: box.height - STACK_OFFSET };
  const back = { ...front, x: front.x + STACK_OFFSET, y: front.y + STACK_OFFSET };
  const backVisibleEdge =
    `M ${r(front.x + front.width)} ${r(back.y + 10)} L ${r(back.x + back.width)} ${r(back.y + 10)} ` +
    `L ${r(back.x + back.width)} ${r(back.y + back.height)} L ${r(back.x + 10)} ${r(back.y + back.height)} ` +
    `L ${r(back.x + 10)} ${r(front.y + front.height)}`;
  return {
    fill: [path(roundedRectPath(front, 10))],
    outline: [path(backVisibleEdge), path(roundedRectPath(front, 10))],
    dots: [],
  };
}

function browserGeometry(box: Box): SilhouetteGeometry {
  const body = path(roundedRectPath(box, 10));
  const barY = box.y + 14;
  return {
    fill: [body],
    outline: [body, line(box.x, barY, box.x + box.width, barY)],
    dots: [0, 1, 2].map((index) => ({ x: box.x + 12 + index * 8, y: box.y + 7.5 })),
  };
}

function queueGeometry(box: Box): SilhouetteGeometry {
  const body = path(roundedRectPath(box, 10));
  const slots = [8, 16, 24].map((offset) =>
    line(box.x + box.width - offset, box.y + 5, box.x + box.width - offset, box.y + box.height - 5),
  );
  return { fill: [body], outline: [body, ...slots], dots: [] };
}

function subroutineGeometry(box: Box): SilhouetteGeometry {
  const body = path(roundedRectPath(box, 4));
  return {
    fill: [body],
    outline: [
      body,
      line(box.x + 7, box.y, box.x + 7, box.y + box.height),
      line(box.x + box.width - 7, box.y, box.x + box.width - 7, box.y + box.height),
    ],
    dots: [],
  };
}

function singleOutline(primitive: ShapePrimitive): SilhouetteGeometry {
  return { fill: [primitive], outline: [primitive], dots: [] };
}

function rimmedGeometry(body: ShapePrimitive, box: Box, rimRadius: number): SilhouetteGeometry {
  const rim: ShapePrimitive = {
    type: 'ellipse',
    centerX: box.x + box.width / 2,
    centerY: box.y + rimRadius,
    width: box.width,
    height: rimRadius * 2,
  };
  return { fill: [body], outline: [body, rim], dots: [] };
}

export function silhouetteGeometry(silhouette: Silhouette, box: Box): SilhouetteGeometry {
  switch (silhouette) {
    case 'cylinder':
      return rimmedGeometry(path(cylinderBodyPath(box)), box, cylinderRimRadius(box));
    case 'bucket':
      return rimmedGeometry(path(bucketBodyPath(box)), box, clamp(box.height * 0.12, 6, 9));
    case 'stacked':
      return stackedGeometry(box);
    case 'browser':
      return browserGeometry(box);
    case 'queue':
      return queueGeometry(box);
    case 'subroutine':
      return subroutineGeometry(box);
    case 'cloud':
      return singleOutline(path(cloudPath(box)));
    case 'hexagon':
      return singleOutline(path(hexagonPath(box)));
    case 'diamond':
      return singleOutline(path(diamondPath(box)));
    case 'ellipse':
      return singleOutline({
        type: 'ellipse',
        centerX: box.x + box.width / 2,
        centerY: box.y + box.height / 2,
        width: box.width,
        height: box.height,
      });
    case 'pill':
      return singleOutline(path(roundedRectPath(box, box.height / 2)));
    case 'rounded':
      return singleOutline(path(roundedRectPath(box, 10)));
  }
}
