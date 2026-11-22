import ELK, { type ElkExtendedEdge, type ElkLabel, type ElkNode } from 'elkjs/lib/elk.bundled.js';
import { measureComponentNode, type ComponentNode } from '../components/component-node.ts';
import { silhouetteFor } from '../components/silhouette.ts';
import { widestLineWidth } from '../text/text-measurement.ts';
import { CONNECTOR_LABEL_TEXT, GROUP_TITLE_TEXT } from '../text/text-styles.ts';
import type { FlowchartLayout, PositionedEdge, PositionedGroup, PositionedNode } from './flowchart-layout-model.ts';
import type { FlowDirection, FlowchartEdge, FlowchartGraph, FlowchartGroup } from './flowchart-model.ts';
import { findFeedbackEdgeIds } from './find-feedback-edges.ts';
import { resolveNodeKind } from './resolve-node-kind.ts';

const ELK_DIRECTION: Record<FlowDirection, string> = { LR: 'RIGHT', RL: 'LEFT', TB: 'DOWN', BT: 'UP' };
const LABEL_PADDING_X = 6;
const LABEL_PADDING_Y = 3;
const GROUP_PADDING = 18;

const BASE_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.randomSeed': '1',
  'elk.json.shapeCoords': 'ROOT',
  'elk.json.edgeCoords': 'ROOT',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.cycleBreaking.strategy': 'GREEDY_MODEL_ORDER',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.spacing.nodeNodeBetweenLayers': '64',
  'elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'elk.spacing.nodeNode': '34',
  'elk.spacing.edgeNode': '20',
  'elk.spacing.edgeEdge': '14',
  'elk.spacing.edgeLabel': '4',
};

interface LayoutContext {
  graph: FlowchartGraph;
  componentNodes: Map<string, ComponentNode>;
  groupsById: Map<string, FlowchartGroup>;
  feedbackEdgeIds: Set<string>;
}

function containerOf(context: LayoutContext, endpointId: string): string | null {
  const group = context.groupsById.get(endpointId);
  if (group) return group.parentGroupId;
  return context.graph.nodes.find((node) => node.id === endpointId)?.groupId ?? null;
}

function edgeCrossesGroups(context: LayoutContext, edge: FlowchartEdge): boolean {
  return containerOf(context, edge.sourceId) !== containerOf(context, edge.targetId);
}

function connectorLabel(edge: FlowchartEdge): ElkLabel[] {
  if (edge.labelLines.length === 0) return [];
  return [
    {
      id: `${edge.id}-label`,
      text: edge.labelLines.join('\n'),
      width: Math.ceil(widestLineWidth(edge.labelLines, CONNECTOR_LABEL_TEXT) + LABEL_PADDING_X * 2),
      height: edge.labelLines.length * CONNECTOR_LABEL_TEXT.lineHeightPx + LABEL_PADDING_Y * 2,
      layoutOptions: { 'elk.edgeLabels.inline': 'true', 'elk.edgeLabels.placement': 'CENTER' },
    },
  ];
}

function elkEdge(context: LayoutContext, edge: FlowchartEdge): ElkExtendedEdge {
  const isFeedback = context.feedbackEdgeIds.has(edge.id);
  return {
    id: edge.id,
    sources: [isFeedback ? edge.targetId : edge.sourceId],
    targets: [isFeedback ? edge.sourceId : edge.targetId],
    labels: connectorLabel(edge),
  };
}

function groupTopPadding(group: FlowchartGroup): number {
  return group.labelLines.length * GROUP_TITLE_TEXT.lineHeightPx + GROUP_PADDING + 8;
}

function elkContainer(context: LayoutContext, containerId: string | null, includeAllEdges: boolean): ElkNode[] {
  const leafNodes: ElkNode[] = context.graph.nodes
    .filter((node) => node.groupId === containerId)
    .map((node) => {
      const measured = context.componentNodes.get(node.id);
      return { id: node.id, width: measured?.width ?? 0, height: measured?.height ?? 0 };
    });
  const groupNodes: ElkNode[] = context.graph.groups
    .filter((group) => group.parentGroupId === containerId)
    .map((group) => ({
      id: group.id,
      layoutOptions: {
        'elk.padding': `[top=${groupTopPadding(group)},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
        'elk.nodeSize.constraints': 'MINIMUM_SIZE',
        'elk.nodeSize.minimum': `(${Math.ceil(widestLineWidth(group.labelLines, GROUP_TITLE_TEXT) + GROUP_PADDING * 2)}, 0)`,
        ...(group.direction ? { 'elk.direction': ELK_DIRECTION[group.direction] } : {}),
      },
      children: elkContainer(context, group.id, includeAllEdges),
      edges: includeAllEdges ? [] : edgesInside(context, group.id),
    }));
  return [...leafNodes, ...groupNodes];
}

function edgesInside(context: LayoutContext, containerId: string | null): ElkExtendedEdge[] {
  return context.graph.edges
    .filter((edge) => containerOf(context, edge.sourceId) === containerId)
    .map((edge) => elkEdge(context, edge));
}

function flattenNodes(node: ElkNode): ElkNode[] {
  return (node.children ?? []).flatMap((child) => [child, ...flattenNodes(child)]);
}

function flattenEdges(node: ElkNode): ElkExtendedEdge[] {
  return [...(node.edges ?? []), ...(node.children ?? []).flatMap(flattenEdges)];
}

function positionedEdge(
  edge: FlowchartEdge,
  laidOut: ElkExtendedEdge | undefined,
  isFeedback: boolean,
): PositionedEdge {
  const section = laidOut?.sections?.[0];
  const laidOutPoints = section ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint] : [];
  const points = isFeedback ? laidOutPoints.reverse() : laidOutPoints;
  const label = laidOut?.labels?.[0];
  const labelBox =
    label?.x === undefined || label.y === undefined
      ? null
      : { x: label.x, y: label.y, width: label.width ?? 0, height: label.height ?? 0 };
  return { edge, points, labelBox };
}

function measureNodes(graph: FlowchartGraph): Map<string, ComponentNode> {
  return new Map(
    graph.nodes.map((node) => {
      const kind = resolveNodeKind(node);
      return [
        node.id,
        measureComponentNode({
          key: node.id,
          labelLines: node.labelLines,
          kind,
          silhouette: silhouetteFor(kind, node.shape),
        }),
      ];
    }),
  );
}

export async function layoutFlowchart(graph: FlowchartGraph): Promise<FlowchartLayout> {
  const context: LayoutContext = {
    graph,
    componentNodes: measureNodes(graph),
    groupsById: new Map(graph.groups.map((group) => [group.id, group])),
    feedbackEdgeIds: findFeedbackEdgeIds(graph),
  };
  const includeAllEdges = graph.edges.some((edge) => edgeCrossesGroups(context, edge));
  const laidOut = await new ELK().layout({
    id: 'root',
    layoutOptions: {
      ...BASE_LAYOUT_OPTIONS,
      'elk.direction': ELK_DIRECTION[graph.direction],
      'elk.hierarchyHandling': includeAllEdges ? 'INCLUDE_CHILDREN' : 'SEPARATE_CHILDREN',
    },
    children: elkContainer(context, null, includeAllEdges),
    edges: includeAllEdges ? graph.edges.map((edge) => elkEdge(context, edge)) : edgesInside(context, null),
  });
  const elkNodes = new Map(flattenNodes(laidOut).map((node) => [node.id, node]));
  const elkEdges = new Map(flattenEdges(laidOut).map((edge) => [edge.id, edge]));
  const boxOf = (id: string) => {
    const elkNode = elkNodes.get(id);
    return { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0, width: elkNode?.width ?? 0, height: elkNode?.height ?? 0 };
  };
  const nodes: PositionedNode[] = [...context.componentNodes.values()].map((node) => ({
    node,
    box: boxOf(node.key),
  }));
  const groups: PositionedGroup[] = graph.groups.map((group) => ({ group, box: boxOf(group.id) }));
  const edges = graph.edges.map((edge) =>
    positionedEdge(edge, elkEdges.get(edge.id), context.feedbackEdgeIds.has(edge.id)),
  );
  return { nodes, groups, edges };
}
