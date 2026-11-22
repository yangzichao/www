import type { FlowchartGraph } from './flowchart-model.ts';

const TITLE_COMPONENT_LIMIT = 5;

function titleOf(graph: FlowchartGraph, id: string): string {
  const node = graph.nodes.find((candidate) => candidate.id === id);
  const group = graph.groups.find((candidate) => candidate.id === id);
  return (node?.labelLines ?? group?.labelLines ?? [id]).join(' ');
}

export function flowchartTitle(graph: FlowchartGraph): string {
  const names = graph.nodes.slice(0, TITLE_COMPONENT_LIMIT).map((node) => node.labelLines[0] ?? node.id);
  const more = graph.nodes.length > TITLE_COMPONENT_LIMIT ? ', …' : '';
  return `Diagram: ${names.join(', ')}${more}`;
}

export function flowchartDescription(graph: FlowchartGraph): string {
  return graph.edges
    .map((edge) => {
      const arrow = edge.arrowAtSource ? '↔' : '→';
      const label = edge.labelLines.length > 0 ? ` (${edge.labelLines.join(' ')})` : '';
      return `${titleOf(graph, edge.sourceId)} ${arrow} ${titleOf(graph, edge.targetId)}${label}`;
    })
    .join('; ');
}
