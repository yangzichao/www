import type { ComponentKind } from './component-kind.ts';

export type Silhouette =
  | 'rounded'
  | 'pill'
  | 'subroutine'
  | 'cylinder'
  | 'bucket'
  | 'browser'
  | 'stacked'
  | 'cloud'
  | 'queue'
  | 'hexagon'
  | 'diamond'
  | 'ellipse';

export type AuthoredNodeShape =
  | 'rectangle'
  | 'rounded'
  | 'stadium'
  | 'subroutine'
  | 'cylinder'
  | 'circle'
  | 'diamond'
  | 'hexagon'
  | 'parallelogram'
  | 'asymmetric';

export interface SilhouetteInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const KIND_SILHOUETTE: Partial<Record<ComponentKind, Silhouette>> = {
  client: 'browser',
  cdn: 'cloud',
  external: 'cloud',
  compute: 'stacked',
  container: 'stacked',
  gpu: 'stacked',
  queue: 'queue',
  stream: 'queue',
  cache: 'cylinder',
  db: 'cylinder',
  nosql: 'cylinder',
  objectstore: 'bucket',
};

const AUTHORED_SHAPE_SILHOUETTE: Record<AuthoredNodeShape, Silhouette> = {
  rectangle: 'rounded',
  rounded: 'rounded',
  stadium: 'pill',
  subroutine: 'subroutine',
  cylinder: 'cylinder',
  circle: 'ellipse',
  diamond: 'diamond',
  hexagon: 'hexagon',
  parallelogram: 'rounded',
  asymmetric: 'rounded',
};

const SILHOUETTE_INSETS: Record<Silhouette, SilhouetteInsets> = {
  rounded: { top: 0, right: 0, bottom: 0, left: 0 },
  pill: { top: 0, right: 12, bottom: 0, left: 12 },
  subroutine: { top: 0, right: 10, bottom: 0, left: 10 },
  cylinder: { top: 18, right: 0, bottom: 8, left: 0 },
  bucket: { top: 16, right: 10, bottom: 8, left: 10 },
  browser: { top: 16, right: 0, bottom: 0, left: 0 },
  stacked: { top: 0, right: 7, bottom: 7, left: 0 },
  cloud: { top: 14, right: 24, bottom: 14, left: 24 },
  queue: { top: 0, right: 28, bottom: 0, left: 0 },
  hexagon: { top: 0, right: 18, bottom: 0, left: 18 },
  diamond: { top: 22, right: 40, bottom: 22, left: 40 },
  ellipse: { top: 10, right: 24, bottom: 10, left: 24 },
};

export function silhouetteFor(kind: ComponentKind, authoredShape: AuthoredNodeShape): Silhouette {
  return KIND_SILHOUETTE[kind] ?? AUTHORED_SHAPE_SILHOUETTE[authoredShape];
}

export function insetsFor(silhouette: Silhouette): SilhouetteInsets {
  return SILHOUETTE_INSETS[silhouette];
}
