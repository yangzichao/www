export const COMPONENT_KINDS = [
  'client',
  'cdn',
  'lb',
  'api',
  'service',
  'compute',
  'container',
  'queue',
  'stream',
  'cache',
  'db',
  'nosql',
  'objectstore',
  'search',
  'scheduler',
  'external',
  'gpu',
  'process',
] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export function isComponentKind(value: string): value is ComponentKind {
  return (COMPONENT_KINDS as readonly string[]).includes(value);
}
