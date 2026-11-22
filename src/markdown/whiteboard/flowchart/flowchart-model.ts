import type { AuthoredNodeShape } from '../components/silhouette.ts';

export type FlowDirection = 'LR' | 'RL' | 'TB' | 'BT';
export type ConnectorStroke = 'solid' | 'dotted' | 'thick';

export interface FlowchartNode {
  id: string;
  labelLines: string[];
  shape: AuthoredNodeShape;
  kindHint: string | null;
  groupId: string | null;
}

export interface FlowchartEdge {
  id: string;
  sourceId: string;
  targetId: string;
  labelLines: string[];
  stroke: ConnectorStroke;
  arrowAtSource: boolean;
  arrowAtTarget: boolean;
}

export interface FlowchartGroup {
  id: string;
  labelLines: string[];
  direction: FlowDirection | null;
  parentGroupId: string | null;
}

export interface FlowchartGraph {
  direction: FlowDirection;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  groups: FlowchartGroup[];
}
