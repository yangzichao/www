import { componentNodeMarkup } from '../components/component-node.ts';
import { INK_COLOR, MUTED_INK_COLOR, NOTE_FILL_COLOR } from '../components/kind-palette.ts';
import { roundedRectPath, type ShapePrimitive } from '../components/silhouette-geometry.ts';
import { diagramFigureMarkup, unionBounds } from '../diagram-figure.ts';
import { connectorLabelMarkup, connectorMarkup } from '../sketch/connector-markup.ts';
import { seedFor, sketchFill, sketchStroke } from '../sketch/rough-sketch.ts';
import { roundCoordinate as r } from '../svg-markup.ts';
import { textBlockMarkup } from '../text/text-markup.ts';
import { CONNECTOR_LABEL_TEXT, NOTE_TEXT } from '../text/text-styles.ts';
import { sequenceDescription, sequenceTitle } from './describe-sequence.ts';
import { layoutSequence } from './layout-sequence.ts';
import type { PositionedMessage, PositionedNote, SequenceLayout } from './sequence-layout-model.ts';
import { NOTE_PADDING_Y } from './sequence-metrics.ts';
import type { SequenceDiagram } from './sequence-model.ts';
import { parseSequence } from './parse-sequence.ts';

function lifelinesMarkup(layout: SequenceLayout, diagramKey: string): string {
  return layout.participants
    .map(({ participant, centerX }) => {
      const lifeline: ShapePrimitive = {
        type: 'path',
        pathData: `M ${r(centerX)} ${r(layout.lifelineTop)} L ${r(centerX)} ${r(layout.lifelineBottom)}`,
      };
      const seed = seedFor(`${diagramKey}:lifeline:${participant.id}`);
      return sketchStroke(
        [lifeline],
        { color: MUTED_INK_COLOR, width: 1.1, dashed: true, roughness: 0.5, bowing: 0.2 },
        seed,
      );
    })
    .join('');
}

function noteMarkup({ note, box }: PositionedNote, diagramKey: string): string {
  const seed = seedFor(`${diagramKey}:${note.id}`);
  const outline: ShapePrimitive[] = [{ type: 'path', pathData: roundedRectPath(box, 4) }];
  return (
    '<g class="wb-note">' +
    sketchFill(outline, { color: NOTE_FILL_COLOR, style: 'solid' }, seed) +
    sketchStroke(outline, { color: INK_COLOR, width: 1.1, roughness: 0.8 }, seed + 1) +
    textBlockMarkup(
      [{ lines: note.labelLines, style: NOTE_TEXT }],
      box.x + box.width / 2,
      box.y + NOTE_PADDING_Y,
      'middle',
    ) +
    '</g>'
  );
}

function messageMarkup({ message, points }: PositionedMessage, diagramKey: string): string {
  return connectorMarkup({
    points,
    line: message.line,
    arrowAtStart: false,
    arrowAtEnd: message.hasArrowhead,
    seed: seedFor(`${diagramKey}:${message.id}`),
  });
}

function messageLabelMarkup({ message, labelBox }: PositionedMessage): string {
  if (!labelBox) return '';
  return connectorLabelMarkup(message.labelLines, labelBox, CONNECTOR_LABEL_TEXT);
}

function layoutBounds(layout: SequenceLayout) {
  return unionBounds([
    ...layout.participants.map(({ box }) => box),
    ...layout.notes.map(({ box }) => box),
    ...layout.messages.flatMap(({ labelBox, points }) => [
      ...(labelBox ? [labelBox] : []),
      ...points.map((point) => ({ ...point, width: 0, height: 0 })),
    ]),
    { x: layout.participants[0]?.centerX ?? 0, y: layout.lifelineBottom, width: 0, height: 0 },
  ]);
}

export function renderSequenceDiagram(diagram: SequenceDiagram, diagramId: string): string {
  const layout = layoutSequence(diagram);
  const body =
    lifelinesMarkup(layout, diagramId) +
    layout.notes.map((note) => noteMarkup(note, diagramId)).join('') +
    layout.messages.map((message) => messageMarkup(message, diagramId)).join('') +
    layout.messages.map(messageLabelMarkup).join('') +
    layout.participants.map(({ node, box }) => componentNodeMarkup(node, box.x, box.y, diagramId)).join('');
  return diagramFigureMarkup({
    diagramId,
    type: 'sequence',
    bounds: layoutBounds(layout),
    title: sequenceTitle(diagram),
    description: sequenceDescription(diagram),
    body,
  });
}

export function renderSequence(source: string, diagramId: string): string {
  return renderSequenceDiagram(parseSequence(source), diagramId);
}
