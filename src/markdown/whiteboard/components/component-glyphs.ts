import { roundCoordinate } from '../svg-markup.ts';
import type { ComponentKind } from './component-kind.ts';

export const GLYPH_SIZE = 20;
const GLYPH_DESIGN_SIZE = 24;

const SERVER_GLYPH =
  '<rect x="4" y="5" width="16" height="6" rx="1.5"/><rect x="4" y="13" width="16" height="6" rx="1.5"/><circle cx="7.5" cy="8" r="1"/><circle cx="7.5" cy="16" r="1"/>';
const GLOBE_GLYPH = '<circle cx="12" cy="12" r="8"/><path d="M4 12 H20 M12 4 C8 7 8 17 12 20 C16 17 16 7 12 4"/>';

const GLYPHS: Partial<Record<ComponentKind, string>> = {
  client: '<circle cx="12" cy="8.5" r="3.4"/><path d="M5.5 19 C6 14.5 18 14.5 18.5 19"/>',
  cdn: GLOBE_GLYPH,
  external: GLOBE_GLYPH,
  lb: '<path d="M3 12 H9 M9 12 L19 5 M9 12 H19 M9 12 L19 19"/><circle cx="20" cy="5" r="1.8"/><circle cx="20" cy="12" r="1.8"/><circle cx="20" cy="19" r="1.8"/><circle cx="4" cy="12" r="1.8"/>',
  api: '<path d="M9 7 L4 12 L9 17 M15 7 L20 12 L15 17"/>',
  service: SERVER_GLYPH,
  compute: SERVER_GLYPH,
  container: '<path d="M12 3 L20 7 L12 11 L4 7 Z M4 7 V16 L12 20 L20 16 V7 M12 11 V20"/>',
  queue: '<path d="M4 7 H20 M4 12 H20 M4 17 H14"/><path d="M16 17 L20 17 M18.5 15.5 L20 17 L18.5 18.5"/>',
  stream: '<path d="M3 14 C6 8 9 8 12 14 C15 20 18 20 21 14"/><path d="M3 9 C6 4 9 4 12 9"/>',
  cache: '<path d="M13 3 L5 13 H11 L9 21 L19 10 H12 Z"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6 V18 C5 19.5 8 20.6 12 20.6 C16 20.6 19 19.5 19 18 V6 M5 12 C5 13.5 8 14.6 12 14.6 C16 14.6 19 13.5 19 12"/>',
  nosql: '<path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z"/><path d="M12 3 V21 M4 7.5 L12 12 L20 7.5"/>',
  objectstore: '<path d="M5 7 H19 L17 19 H7 Z"/><ellipse cx="12" cy="7" rx="7" ry="2.2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15 L20.5 20.5"/>',
  scheduler: '<circle cx="12" cy="12" r="8"/><path d="M12 7 V12 L15.5 14.5"/>',
  gpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 6 V3 M15 6 V3 M9 18 V21 M15 18 V21 M6 9 H3 M6 15 H3 M18 9 H21 M18 15 H21"/>',
};

export function hasGlyph(kind: ComponentKind): boolean {
  return GLYPHS[kind] !== undefined;
}

export function glyphMarkup(kind: ComponentKind, left: number, top: number): string {
  const glyph = GLYPHS[kind];
  if (glyph === undefined) return '';
  const scale = GLYPH_SIZE / GLYPH_DESIGN_SIZE;
  return `<g class="wb-glyph" transform="translate(${roundCoordinate(left)} ${roundCoordinate(top)}) scale(${roundCoordinate(scale * 100) / 100})">${glyph}</g>`;
}
