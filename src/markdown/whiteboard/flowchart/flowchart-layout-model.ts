import type { ComponentNode } from '../components/component-node.ts';
import type { Box } from '../components/silhouette-geometry.ts';
import type { Point } from '../sketch/connector-geometry.ts';
import type { FlowchartEdge, FlowchartGroup } from './flowchart-model.ts';

export interface PositionedNode {
  node: ComponentNode;
  box: Box;
}

export interface PositionedGroup {
  group: FlowchartGroup;
  box: Box;
}

export interface PositionedEdge {
  edge: FlowchartEdge;
  points: Point[];
  labelBox: Box | null;
}

export interface FlowchartLayout {
  nodes: PositionedNode[];
  groups: PositionedGroup[];
  edges: PositionedEdge[];
}
