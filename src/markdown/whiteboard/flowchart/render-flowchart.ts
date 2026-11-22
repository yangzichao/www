import { componentNodeMarkup } from '../components/component-node.ts';
import { MUTED_INK_COLOR } from '../components/kind-palette.ts';
import { roundedRectPath } from '../components/silhouette-geometry.ts';
import { diagramFigureMarkup, unionBounds } from '../diagram-figure.ts';
import { connectorLabelMarkup, connectorMarkup, type ConnectorLine } from '../sketch/connector-markup.ts';
import { seedFor, sketchFill, sketchStroke } from '../sketch/rough-sketch.ts';
import { textBlockMarkup } from '../text/text-markup.ts';
import { widestLineWidth } from '../text/text-measurement.ts';
import { CONNECTOR_LABEL_TEXT, GROUP_TITLE_TEXT } from '../text/text-styles.ts';
import { flowchartDescription, flowchartTitle } from './describe-flowchart.ts';
import type { PositionedEdge, PositionedGroup } from './flowchart-layout-model.ts';
import type { ConnectorStroke, FlowchartGraph } from './flowchart-model.ts';
import { layoutFlowchart } from './layout-flowchart.ts';
import { parseFlowchart } from './parse-flowchart.ts';

const GROUP_FILL_COLOR = '#f1f3f5';
const GROUP_TITLE_INSET = 14;

const CONNECTOR_LINE: Record<ConnectorStroke, ConnectorLine> = { solid: 'solid', dotted: 'dashed', thick: 'thick' };

function groupMarkup({ group, box }: PositionedGroup, diagramKey: string): string {
  const seed = seedFor(`${diagramKey}:group:${group.id}`);
  const outline = [{ type: 'path' as const, pathData: roundedRectPath(box, 14) }];
  return (
    '<g class="wb-group">' +
    sketchFill(outline, { color: GROUP_FILL_COLOR, style: 'solid' }, seed) +
    sketchStroke(outline, { color: MUTED_INK_COLOR, width: 1.1, dashed: true, roughness: 0.7, bowing: 0.3 }, seed + 1) +
    '</g>'
  );
}

function groupTitleMarkup({ group, box }: PositionedGroup): string {
  const titleBox = {
    x: box.x + GROUP_TITLE_INSET - 6,
    y: box.y + GROUP_TITLE_INSET - 6,
    width: widestLineWidth(group.labelLines, GROUP_TITLE_TEXT) + 12,
    height: group.labelLines.length * GROUP_TITLE_TEXT.lineHeightPx + 4,
  };
  return (
    `<g class="wb-group-title"><path d="${roundedRectPath(titleBox, 4)}" fill="${GROUP_FILL_COLOR}"/>` +
    textBlockMarkup([{ lines: group.labelLines, style: GROUP_TITLE_TEXT }], titleBox.x + 6, titleBox.y + 2, 'start') +
    '</g>'
  );
}

function edgeMarkup({ edge, points }: PositionedEdge, diagramKey: string): string {
  return connectorMarkup({
    points,
    line: CONNECTOR_LINE[edge.stroke],
    arrowAtStart: edge.arrowAtSource,
    arrowAtEnd: edge.arrowAtTarget,
    seed: seedFor(`${diagramKey}:${edge.id}`),
  });
}

function edgeLabelMarkup({ edge, labelBox }: PositionedEdge): string {
  if (!labelBox) return '';
  return connectorLabelMarkup(edge.labelLines, labelBox, CONNECTOR_LABEL_TEXT);
}

export async function renderFlowchartGraph(graph: FlowchartGraph, diagramId: string): Promise<string> {
  const layout = await layoutFlowchart(graph);
  const bounds = unionBounds([
    ...layout.nodes.map(({ box }) => box),
    ...layout.groups.map(({ box }) => box),
    ...layout.edges.flatMap(({ labelBox, points }) => [
      ...(labelBox ? [labelBox] : []),
      ...points.map((point) => ({ ...point, width: 0, height: 0 })),
    ]),
  ]);
  const body =
    layout.groups.map((group) => groupMarkup(group, diagramId)).join('') +
    layout.edges.map((edge) => edgeMarkup(edge, diagramId)).join('') +
    layout.nodes.map(({ node, box }) => componentNodeMarkup(node, box.x, box.y, diagramId)).join('') +
    layout.groups.map(groupTitleMarkup).join('') +
    layout.edges.map(edgeLabelMarkup).join('');
  return diagramFigureMarkup({
    diagramId,
    type: 'flowchart',
    bounds,
    title: flowchartTitle(graph),
    description: flowchartDescription(graph),
    body,
  });
}

export function renderFlowchart(source: string, diagramId: string): Promise<string> {
  return renderFlowchartGraph(parseFlowchart(source), diagramId);
}
