import type { AuthoredNodeShape } from '../components/silhouette.ts';

export interface NodeReference {
  id: string;
  rawLabel: string | null;
  shape: AuthoredNodeShape | null;
  kindHint: string | null;
}

export interface ScanResult<Value> {
  value: Value;
  nextIndex: number;
}

interface ShapeDelimiter {
  open: string;
  close: string;
  shape: AuthoredNodeShape;
}

const SHAPE_DELIMITERS: readonly ShapeDelimiter[] = [
  { open: '[(', close: ')]', shape: 'cylinder' },
  { open: '((', close: '))', shape: 'circle' },
  { open: '([', close: '])', shape: 'stadium' },
  { open: '[[', close: ']]', shape: 'subroutine' },
  { open: '{{', close: '}}', shape: 'hexagon' },
  { open: '[/', close: '/]', shape: 'parallelogram' },
  { open: '[\\', close: '\\]', shape: 'parallelogram' },
  { open: '>', close: ']', shape: 'asymmetric' },
  { open: '[', close: ']', shape: 'rectangle' },
  { open: '(', close: ')', shape: 'rounded' },
  { open: '{', close: '}', shape: 'diamond' },
];

const NODE_ID_PATTERN = /[\p{L}\p{N}_]+/uy;
const KIND_HINT_PATTERN = /:::([\p{L}\p{N}_-]+)/uy;

function matchAt(pattern: RegExp, text: string, index: number): RegExpExecArray | null {
  pattern.lastIndex = index;
  return pattern.exec(text);
}

function scanLabel(text: string, index: number, close: string): ScanResult<string> | null {
  if (text[index] === '"') {
    const closingQuote = text.indexOf('"', index + 1);
    if (closingQuote === -1) return null;
    const afterQuote = text.slice(closingQuote + 1).search(/\S/);
    const closeIndex = afterQuote === -1 ? -1 : closingQuote + 1 + afterQuote;
    if (closeIndex === -1 || !text.startsWith(close, closeIndex)) return null;
    return { value: text.slice(index, closingQuote + 1), nextIndex: closeIndex + close.length };
  }
  const closeIndex = text.indexOf(close, index);
  if (closeIndex === -1) return null;
  return { value: text.slice(index, closeIndex), nextIndex: closeIndex + close.length };
}

export function scanNodeReference(text: string, index: number): ScanResult<NodeReference> | null {
  const idMatch = matchAt(NODE_ID_PATTERN, text, index);
  if (!idMatch) return null;
  let cursor = index + idMatch[0].length;
  let rawLabel: string | null = null;
  let shape: AuthoredNodeShape | null = null;
  const delimiter = SHAPE_DELIMITERS.find((candidate) => text.startsWith(candidate.open, cursor));
  if (delimiter) {
    const label = scanLabel(text, cursor + delimiter.open.length, delimiter.close);
    if (!label) return null;
    rawLabel = label.value;
    shape = delimiter.shape;
    cursor = label.nextIndex;
  }
  const kindMatch = matchAt(KIND_HINT_PATTERN, text, cursor);
  const kindHint = kindMatch?.[1] ?? null;
  if (kindMatch) cursor += kindMatch[0].length;
  return { value: { id: idMatch[0], rawLabel, shape, kindHint }, nextIndex: cursor };
}
