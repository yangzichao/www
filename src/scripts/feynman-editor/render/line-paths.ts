import type { LoopElement, PropagatorElement } from '../diagram-types';
import { basePathLength, sampleBasePath, sampleLoop } from '../geometry';
import type { SampledPoint } from '../geometry';

export const PHOTON_AMPLITUDE = 3.5;
export const GLUON_AMPLITUDE = 4.5;
const PHOTON_WIGGLE_SPACING = 14;
const GLUON_WINDING_SPACING = 13;
const SAMPLES_PER_WIGGLE = 16;

export function photonWiggleCountForLength(pathLength: number): number {
  return Math.max(2, Math.round(pathLength / PHOTON_WIGGLE_SPACING));
}

export function gluonWindingCountForLength(pathLength: number): number {
  return Math.max(2, Math.round(pathLength / GLUON_WINDING_SPACING));
}

export function photonWiggleCount(line: PropagatorElement): number {
  return photonWiggleCountForLength(basePathLength(line));
}

export function gluonWindingCount(line: PropagatorElement): number {
  return gluonWindingCountForLength(basePathLength(line));
}

export function loopPathLength(loop: LoopElement): number {
  return 2 * Math.PI * loop.radius;
}

function polylineToPathData(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

/** Plain base path of a propagator (fermion, scalar, ghost, selection halos). */
export function basePathData(line: PropagatorElement): string {
  return polylineToPathData(sampleBasePath(line, 48));
}

/** Plain circle outline of a loop. */
export function loopBasePathData(loop: LoopElement): string {
  return polylineToPathData(sampleLoop(loop, 64));
}

export function photonPathData(line: PropagatorElement): string {
  return photonPathFromSamples(denseSamples(line), photonWiggleCount(line));
}

export function gluonPathData(line: PropagatorElement): string {
  return gluonPathFromSamples(denseSamples(line), gluonWindingCount(line));
}

export function loopPhotonPathData(loop: LoopElement): string {
  const wiggles = photonWiggleCountForLength(loopPathLength(loop));
  return photonPathFromSamples(sampleLoop(loop, 256), wiggles);
}

export function loopGluonPathData(loop: LoopElement): string {
  const windings = gluonWindingCountForLength(loopPathLength(loop));
  return gluonPathFromSamples(sampleLoop(loop, 256), windings);
}

/**
 * Sine wave laid along a sampled base path: offset each point along the
 * local normal by amp · sin(2π · wiggles · t). Zero offset at both ends,
 * so open paths meet their endpoints and closed paths close cleanly.
 */
function photonPathFromSamples(dense: SampledPoint[], wiggles: number): string {
  const count = wiggles * SAMPLES_PER_WIGGLE + 1;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const offset = PHOTON_AMPLITUDE * Math.sin(2 * Math.PI * wiggles * t);
    points.push(offsetAlongNormal(interpolateSamples(dense, t), offset));
  }
  return polylineToPathData(points);
}

/**
 * Gluon coil as a prolate cycloid along a sampled base path:
 *   along(φ)  = a·φ − b·sin(φ)   (loops back on itself because b > a)
 *   normal(φ) = b·(1 − cos(φ))   (loops sit on one side of the line)
 * with φ ∈ [0, 2π·windings], remapped so the curve spans the full path.
 */
function gluonPathFromSamples(dense: SampledPoint[], windings: number): string {
  const b = GLUON_AMPLITUDE;
  const phiMax = 2 * Math.PI * windings;
  const count = windings * SAMPLES_PER_WIGGLE + 1;
  const a = b * 0.55;
  const alongSpan = a * phiMax;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const phi = (i / (count - 1)) * phiMax;
    const t = Math.max(0, Math.min(1, (a * phi - b * Math.sin(phi)) / alongSpan));
    const offset = b * (1 - Math.cos(phi)) - b;
    points.push(offsetAlongNormal(interpolateSamples(dense, t), offset));
  }
  return polylineToPathData(points);
}

function denseSamples(line: PropagatorElement): SampledPoint[] {
  return sampleBasePath(line, 128);
}

function interpolateSamples(samples: SampledPoint[], t: number): SampledPoint {
  const index = t * (samples.length - 1);
  const lower = Math.floor(index);
  const upper = Math.min(samples.length - 1, lower + 1);
  const frac = index - lower;
  const s0 = samples[lower];
  const s1 = samples[upper];
  return {
    x: s0.x + (s1.x - s0.x) * frac,
    y: s0.y + (s1.y - s0.y) * frac,
    tx: s0.tx + (s1.tx - s0.tx) * frac,
    ty: s0.ty + (s1.ty - s0.ty) * frac,
  };
}

function offsetAlongNormal(sample: SampledPoint, offset: number): { x: number; y: number } {
  // Left-hand normal of the tangent (SVG y-down).
  return {
    x: sample.x + -sample.ty * offset,
    y: sample.y + sample.tx * offset,
  };
}
