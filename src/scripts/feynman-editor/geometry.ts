import type { LoopElement, PropagatorElement } from './diagram-types';

export interface Point {
  x: number;
  y: number;
}

export interface SampledPoint extends Point {
  /** Unit tangent of the base path at this sample. */
  tx: number;
  ty: number;
}

export interface ArcGeometry {
  cx: number;
  cy: number;
  radius: number;
  /** Angle (radians) from center to the start point. */
  startAngle: number;
  /**
   * Signed angular sweep from start to end, going through the apex.
   * Positive = counter-clockwise in SVG's y-down coordinate system.
   */
  sweep: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Circular arc through the propagator's endpoints whose apex sits `bend`
 * pixels from the chord midpoint, along the left-hand normal of p1→p2.
 * Returns null for straight lines (|bend| too small to matter).
 */
export function arcFromBend(line: PropagatorElement): ArcGeometry | null {
  const chordLength = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
  if (Math.abs(line.bend) < 0.5 || chordLength < 1) return null;

  const h = line.bend;
  const midX = (line.x1 + line.x2) / 2;
  const midY = (line.y1 + line.y2) / 2;
  // Left-hand normal of the chord direction (SVG y-down).
  const normalX = -(line.y2 - line.y1) / chordLength;
  const normalY = (line.x2 - line.x1) / chordLength;

  const radius = Math.abs(h) / 2 + (chordLength * chordLength) / (8 * Math.abs(h));
  // Center sits on the normal line through the midpoint, on the side
  // opposite the apex (for minor arcs).
  const centerOffset = h - Math.sign(h) * radius;
  const cx = midX + normalX * centerOffset;
  const cy = midY + normalY * centerOffset;

  const startAngle = Math.atan2(line.y1 - cy, line.x1 - cx);
  const endAngle = Math.atan2(line.y2 - cy, line.x2 - cx);

  // Choose the sweep direction whose midpoint passes through the apex.
  // The apex sits at center + sign(h)·R·normal, so its angle from the
  // center is the direction of sign(h)·normal.
  const apexAngle = Math.atan2(Math.sign(h) * normalY, Math.sign(h) * normalX);
  let sweep = endAngle - startAngle;
  while (sweep <= -Math.PI) sweep += 2 * Math.PI;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  let midpointDeviation = startAngle + sweep / 2 - apexAngle;
  while (midpointDeviation <= -Math.PI) midpointDeviation += 2 * Math.PI;
  while (midpointDeviation > Math.PI) midpointDeviation -= 2 * Math.PI;
  if (Math.abs(midpointDeviation) > 0.01) {
    sweep += sweep > 0 ? -2 * Math.PI : 2 * Math.PI;
  }

  return { cx, cy, radius, startAngle, sweep };
}

/** Total length of the base path (chord or arc). */
export function basePathLength(line: PropagatorElement): number {
  const arc = arcFromBend(line);
  if (arc) return arc.radius * Math.abs(arc.sweep);
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

/**
 * Uniformly sample the base path (straight chord or circular arc) with
 * positions and unit tangents, t ∈ [0, 1] over `count` samples.
 */
export function sampleBasePath(line: PropagatorElement, count: number): SampledPoint[] {
  const samples: SampledPoint[] = [];
  const arc = arcFromBend(line);

  if (!arc) {
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.hypot(dx, dy) || 1;
    const tx = dx / length;
    const ty = dy / length;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      samples.push({ x: line.x1 + dx * t, y: line.y1 + dy * t, tx, ty });
    }
    return samples;
  }

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = arc.startAngle + arc.sweep * t;
    const x = arc.cx + arc.radius * Math.cos(angle);
    const y = arc.cy + arc.radius * Math.sin(angle);
    // Tangent is perpendicular to the radius, oriented along the sweep.
    const direction = Math.sign(arc.sweep);
    samples.push({
      x,
      y,
      tx: -Math.sin(angle) * direction,
      ty: Math.cos(angle) * direction,
    });
  }
  return samples;
}

/** Point and tangent at parameter t ∈ [0, 1] along the base path. */
export function basePathPointAt(line: PropagatorElement, t: number): SampledPoint {
  const arc = arcFromBend(line);
  if (!arc) {
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.hypot(dx, dy) || 1;
    return { x: line.x1 + dx * t, y: line.y1 + dy * t, tx: dx / length, ty: dy / length };
  }
  const angle = arc.startAngle + arc.sweep * t;
  const direction = Math.sign(arc.sweep);
  return {
    x: arc.cx + arc.radius * Math.cos(angle),
    y: arc.cy + arc.radius * Math.sin(angle),
    tx: -Math.sin(angle) * direction,
    ty: Math.cos(angle) * direction,
  };
}

/**
 * Uniformly sample a full-circle loop with positions and unit tangents.
 * Starts and ends at angle 0 (the right-hand point of the circle).
 */
export function sampleLoop(loop: LoopElement, count: number): SampledPoint[] {
  const samples: SampledPoint[] = [];
  const direction = loop.reversed ? -1 : 1;
  for (let i = 0; i < count; i++) {
    const angle = direction * 2 * Math.PI * (i / (count - 1));
    samples.push({
      x: loop.cx + loop.radius * Math.cos(angle),
      y: loop.cy + loop.radius * Math.sin(angle),
      tx: -Math.sin(angle) * direction,
      ty: Math.cos(angle) * direction,
    });
  }
  return samples;
}

/** Distance from a point to the loop's circle outline. */
export function distanceToLoopOutline(loop: LoopElement, point: Point): number {
  return Math.abs(distance(point, { x: loop.cx, y: loop.cy }) - loop.radius);
}

/** Shortest distance from a point to the propagator's base path. */
export function distanceToBasePath(line: PropagatorElement, point: Point): number {
  const samples = sampleBasePath(line, 48);
  let best = Infinity;
  for (let i = 0; i < samples.length - 1; i++) {
    best = Math.min(best, distanceToSegment(point, samples[i], samples[i + 1]));
  }
  return best;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const lengthSquared = abX * abX + abY * abY;
  if (lengthSquared === 0) return distance(p, a);
  let t = ((p.x - a.x) * abX + (p.y - a.y) * abY) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + abX * t), p.y - (a.y + abY * t));
}

/**
 * Signed perpendicular offset of `point` from the chord of p1→p2, using
 * the same left-hand-normal convention as `arcFromBend`. Used when
 * dragging the mid-handle to set the bend.
 */
export function signedOffsetFromChord(line: PropagatorElement, point: Point): number {
  const chordLength = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
  if (chordLength < 1) return 0;
  const normalX = -(line.y2 - line.y1) / chordLength;
  const normalY = (line.x2 - line.x1) / chordLength;
  const midX = (line.x1 + line.x2) / 2;
  const midY = (line.y1 + line.y2) / 2;
  return (point.x - midX) * normalX + (point.y - midY) * normalY;
}
