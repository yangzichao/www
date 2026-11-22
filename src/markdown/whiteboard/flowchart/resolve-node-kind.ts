import { isComponentKind, type ComponentKind } from '../components/component-kind.ts';
import { inferComponentKind, inferStorageKind } from '../components/infer-component-kind.ts';
import type { FlowchartNode } from './flowchart-model.ts';

export function resolveNodeKind(node: FlowchartNode): ComponentKind {
  if (node.kindHint && isComponentKind(node.kindHint)) return node.kindHint;
  const label = node.labelLines[0] ?? node.id;
  return node.shape === 'cylinder' ? inferStorageKind(label) : inferComponentKind(label);
}
