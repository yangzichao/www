import { measureComponentNode, type ComponentNode } from '../components/component-node.ts';
import { silhouetteFor } from '../components/silhouette.ts';
import type { Box } from '../components/silhouette-geometry.ts';
import { columnCenters } from './sequence-columns.ts';
import type {
  PositionedMessage,
  PositionedNote,
  PositionedParticipant,
  SequenceLayout,
} from './sequence-layout-model.ts';
import {
  LABEL_GAP,
  messageLabelSize,
  NOTE_SIDE_GAP,
  NOTE_SPAN_OVERHANG,
  noteSize,
  ROW_GAP,
  SELF_LABEL_OFFSET,
  SELF_LOOP_MIN_HEIGHT,
  SELF_LOOP_WIDTH,
  sizedBox,
} from './sequence-metrics.ts';
import type { SequenceDiagram, SequenceMessage, SequenceNote, SequenceParticipant } from './sequence-model.ts';
import { spacingRulesFor } from './sequence-spacing-rules.ts';
import { resolveParticipantKind } from './resolve-participant-kind.ts';

interface Placed<T> {
  item: T;
  nextTop: number;
}

function measureParticipant(participant: SequenceParticipant): ComponentNode {
  const kind = resolveParticipantKind(participant);
  return measureComponentNode({
    key: `participant:${participant.id}`,
    labelLines: participant.labelLines,
    kind,
    silhouette: silhouetteFor(kind, 'rectangle'),
  });
}

function placeParticipants(diagram: SequenceDiagram): PositionedParticipant[] {
  const measured = diagram.participants.map((participant) => ({ participant, node: measureParticipant(participant) }));
  const columnIndex = new Map(diagram.participants.map((participant, index) => [participant.id, index]));
  const columnOf = (id: string): number => columnIndex.get(id) ?? 0;
  const centers = columnCenters(
    measured.map(({ node }) => node.width),
    spacingRulesFor(diagram.steps, columnOf),
  );
  const headerHeight = Math.max(0, ...measured.map(({ node }) => node.height));
  return measured.map(({ participant, node }, index) => {
    const centerX = centers[index] ?? 0;
    const box = {
      x: centerX - node.width / 2,
      y: (headerHeight - node.height) / 2,
      width: node.width,
      height: node.height,
    };
    return { participant, node, box, centerX };
  });
}

function placeStraightMessage(
  message: SequenceMessage,
  sourceX: number,
  targetX: number,
  top: number,
): Placed<PositionedMessage> {
  const labelSize = messageLabelSize(message.labelLines);
  const lineY = top + labelSize.height + LABEL_GAP;
  const labelBox = labelSize.height > 0 ? sizedBox((sourceX + targetX - labelSize.width) / 2, top, labelSize) : null;
  return {
    item: {
      message,
      points: [
        { x: sourceX, y: lineY },
        { x: targetX, y: lineY },
      ],
      labelBox,
    },
    nextTop: lineY + ROW_GAP,
  };
}

function placeSelfMessage(message: SequenceMessage, centerX: number, top: number): Placed<PositionedMessage> {
  const labelSize = messageLabelSize(message.labelLines);
  const loopTop = top + LABEL_GAP;
  const loopHeight = Math.max(SELF_LOOP_MIN_HEIGHT, labelSize.height);
  const loopRight = centerX + SELF_LOOP_WIDTH;
  const labelBox =
    labelSize.height > 0
      ? sizedBox(loopRight + SELF_LABEL_OFFSET, loopTop + (loopHeight - labelSize.height) / 2, labelSize)
      : null;
  return {
    item: {
      message,
      points: [
        { x: centerX, y: loopTop },
        { x: loopRight, y: loopTop },
        { x: loopRight, y: loopTop + loopHeight },
        { x: centerX, y: loopTop + loopHeight },
      ],
      labelBox,
    },
    nextTop: loopTop + loopHeight + ROW_GAP,
  };
}

function noteLeft(note: SequenceNote, centers: readonly number[], width: number): number {
  const first = centers[0] ?? 0;
  const last = centers.at(-1) ?? first;
  if (note.placement === 'leftOf') return first - NOTE_SIDE_GAP - width;
  if (note.placement === 'rightOf') return first + NOTE_SIDE_GAP;
  return (Math.min(first, last) + Math.max(first, last) - width) / 2;
}

function placeNote(note: SequenceNote, centers: readonly number[], top: number): Placed<PositionedNote> {
  const size = noteSize(note.labelLines);
  const span = centers.length > 1 ? Math.abs((centers.at(-1) ?? 0) - (centers[0] ?? 0)) + NOTE_SPAN_OVERHANG * 2 : 0;
  const width = Math.max(size.width, span);
  const box: Box = { x: noteLeft(note, centers, width), y: top, width, height: size.height };
  return { item: { note, box }, nextTop: top + size.height + ROW_GAP };
}

export function layoutSequence(diagram: SequenceDiagram): SequenceLayout {
  const participants = placeParticipants(diagram);
  const centerOf = new Map(participants.map(({ participant, centerX }) => [participant.id, centerX]));
  const centerFor = (id: string): number => centerOf.get(id) ?? 0;
  const lifelineTop = Math.max(0, ...participants.map(({ box }) => box.y + box.height));
  const messages: PositionedMessage[] = [];
  const notes: PositionedNote[] = [];
  let top = lifelineTop + ROW_GAP;
  for (const step of diagram.steps) {
    if (step.type === 'note') {
      const placed = placeNote(step, step.participantIds.map(centerFor), top);
      notes.push(placed.item);
      top = placed.nextTop;
      continue;
    }
    const placed =
      step.sourceId === step.targetId
        ? placeSelfMessage(step, centerFor(step.sourceId), top)
        : placeStraightMessage(step, centerFor(step.sourceId), centerFor(step.targetId), top);
    messages.push(placed.item);
    top = placed.nextTop;
  }
  return { participants, messages, notes, lifelineTop, lifelineBottom: top };
}
