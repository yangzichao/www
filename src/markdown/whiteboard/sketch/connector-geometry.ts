import type { ShapePrimitive } from '../components/silhouette-geometry.ts';
import { roundCoordinate as r } from '../svg-markup.ts';

export interface Point {
  x: number;
  y: number;
}

const CORNER_RADIUS = 12;
const ARROWHEAD_LENGTH = 12;
const ARROWHEAD_SPREAD_RADIANS = (26 * Math.PI) / 180;

function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function pointToward(from: Point, to: Point, length: number): Point {
  const total = distance(from, to);
  if (total === 0) return from;
  return { x: from.x + ((to.x - from.x) * length) / total, y: from.y + ((to.y - from.y) * length) / total };
}

export function roundedPolylinePath(points: readonly Point[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  const commands = [`M ${r(first.x)} ${r(first.y)}`];
  rest.forEach((corner, index) => {
    const previous = points[index] ?? first;
    const next = rest[index + 1];
    if (!next) {
      commands.push(`L ${r(corner.x)} ${r(corner.y)}`);
      return;
    }
    const radius = Math.min(CORNER_RADIUS, distance(previous, corner) / 2, distance(corner, next) / 2);
    const entry = pointToward(corner, previous, radius);
    const exit = pointToward(corner, next, radius);
    commands.push(`L ${r(entry.x)} ${r(entry.y)} Q ${r(corner.x)} ${r(corner.y)} ${r(exit.x)} ${r(exit.y)}`);
  });
  return commands.join(' ');
}

export function arrowheadPrimitive(tip: Point, from: Point): ShapePrimitive {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const wing = (offset: number): Point => ({
    x: tip.x - ARROWHEAD_LENGTH * Math.cos(angle + offset),
    y: tip.y - ARROWHEAD_LENGTH * Math.sin(angle + offset),
  });
  const left = wing(ARROWHEAD_SPREAD_RADIANS);
  const right = wing(-ARROWHEAD_SPREAD_RADIANS);
  return {
    type: 'path',
    pathData: `M ${r(left.x)} ${r(left.y)} L ${r(tip.x)} ${r(tip.y)} L ${r(right.x)} ${r(right.y)}`,
  };
}
