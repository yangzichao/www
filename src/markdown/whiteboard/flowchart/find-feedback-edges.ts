import type { FlowchartGraph } from './flowchart-model.ts';

type VisitState = 'onPath' | 'finished';

export function findFeedbackEdgeIds(graph: FlowchartGraph): Set<string> {
  const outgoing = new Map<string, { edgeId: string; targetId: string }[]>();
  for (const edge of graph.edges) {
    if (edge.sourceId === edge.targetId) continue;
    const list = outgoing.get(edge.sourceId) ?? [];
    list.push({ edgeId: edge.id, targetId: edge.targetId });
    outgoing.set(edge.sourceId, list);
  }
  const visitState = new Map<string, VisitState>();
  const feedbackEdgeIds = new Set<string>();
  const visit = (nodeId: string): void => {
    visitState.set(nodeId, 'onPath');
    for (const { edgeId, targetId } of outgoing.get(nodeId) ?? []) {
      const targetState = visitState.get(targetId);
      if (targetState === 'onPath') feedbackEdgeIds.add(edgeId);
      else if (targetState === undefined) visit(targetId);
    }
    visitState.set(nodeId, 'finished');
  };
  const declarationOrder = [
    ...graph.nodes.map((node) => node.id),
    ...graph.groups.map((group) => group.id),
    ...graph.edges.map((edge) => edge.sourceId),
  ];
  for (const nodeId of declarationOrder) {
    if (!visitState.has(nodeId)) visit(nodeId);
  }
  return feedbackEdgeIds;
}
