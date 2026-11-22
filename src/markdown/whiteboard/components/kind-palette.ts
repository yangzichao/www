import type { ComponentKind } from './component-kind.ts';

export const INK_COLOR = '#1e1e1e';
export const MUTED_INK_COLOR = '#868e96';
export const NOTE_FILL_COLOR = '#fff3bf';

const OPEN_COLOR = {
  gray: '#dee2e6',
  violet: '#d0bfff',
  grape: '#eebefa',
  green: '#b2f2bb',
  teal: '#96f2d7',
  cyan: '#99e9f2',
  yellow: '#ffec99',
  orange: '#ffd8a8',
  blue: '#a5d8ff',
  red: '#ffc9c9',
  pink: '#fcc2d7',
} as const;

const KIND_FILL_COLOR: Record<ComponentKind, string> = {
  client: OPEN_COLOR.gray,
  cdn: OPEN_COLOR.violet,
  lb: OPEN_COLOR.violet,
  api: OPEN_COLOR.violet,
  service: OPEN_COLOR.green,
  scheduler: OPEN_COLOR.green,
  compute: OPEN_COLOR.teal,
  container: OPEN_COLOR.teal,
  gpu: OPEN_COLOR.cyan,
  queue: OPEN_COLOR.yellow,
  stream: OPEN_COLOR.orange,
  db: OPEN_COLOR.blue,
  nosql: OPEN_COLOR.blue,
  cache: OPEN_COLOR.red,
  objectstore: OPEN_COLOR.orange,
  search: OPEN_COLOR.grape,
  external: OPEN_COLOR.pink,
  process: OPEN_COLOR.green,
};

export function fillColorFor(kind: ComponentKind): string {
  return KIND_FILL_COLOR[kind];
}
