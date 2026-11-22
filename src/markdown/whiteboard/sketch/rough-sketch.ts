import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import type { ShapePrimitive } from '../components/silhouette-geometry.ts';
import { INK_COLOR } from '../components/kind-palette.ts';
import { escapeXml, roundNumbersInPath, stableHash } from '../svg-markup.ts';

type RoughGenerator = ReturnType<typeof rough.generator>;

const MAX_SEED = 2_000_000_000;

let sharedGenerator: RoughGenerator | null = null;

function roughGenerator(): RoughGenerator {
  sharedGenerator ??= rough.generator();
  return sharedGenerator;
}

export function seedFor(key: string): number {
  return (stableHash(key) % MAX_SEED) + 1;
}

function sketchPaths(primitive: ShapePrimitive, options: Options): string[] {
  const generator = roughGenerator();
  const drawable =
    primitive.type === 'ellipse'
      ? generator.ellipse(primitive.centerX, primitive.centerY, primitive.width, primitive.height, options)
      : generator.path(primitive.pathData, options);
  return generator.toPaths(drawable).map((sketched) => roundNumbersInPath(sketched.d));
}

function pathElements(pathDataList: readonly string[], attributes: string): string {
  return pathDataList.map((pathData) => `<path d="${pathData}" ${attributes}/>`).join('');
}

export interface FillSketch {
  color: string;
  style: 'hachure' | 'solid';
}

export function sketchFill(primitives: readonly ShapePrimitive[], fill: FillSketch, seed: number): string {
  const options: Options = {
    fill: fill.color,
    fillStyle: fill.style,
    fillWeight: 1.4,
    hachureGap: 6,
    hachureAngle: -41,
    stroke: 'none',
    roughness: 1,
    seed,
  };
  const attributes =
    fill.style === 'solid'
      ? `fill="${escapeXml(fill.color)}" stroke="none"`
      : `fill="none" stroke="${escapeXml(fill.color)}" stroke-width="1.6" stroke-linecap="round"`;
  return primitives.map((primitive) => pathElements(sketchPaths(primitive, options), attributes)).join('');
}

export interface StrokeSketch {
  color?: string;
  width?: number;
  dashed?: boolean;
  roughness?: number;
  bowing?: number;
}

export function sketchStroke(primitives: readonly ShapePrimitive[], stroke: StrokeSketch, seed: number): string {
  const color = stroke.color ?? INK_COLOR;
  const width = stroke.width ?? 1.4;
  const options: Options = {
    stroke: color,
    strokeWidth: width,
    roughness: stroke.roughness ?? 1,
    bowing: stroke.bowing ?? 0.8,
    seed,
    ...(stroke.dashed ? { strokeLineDash: [7, 6], disableMultiStroke: true } : {}),
  };
  const dashAttribute = stroke.dashed ? ' stroke-dasharray="7 6"' : '';
  const attributes = `fill="none" stroke="${escapeXml(color)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dashAttribute}`;
  return primitives.map((primitive) => pathElements(sketchPaths(primitive, options), attributes)).join('');
}
