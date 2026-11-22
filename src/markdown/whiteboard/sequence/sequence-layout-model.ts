import type { ComponentNode } from '../components/component-node.ts';
import type { Box } from '../components/silhouette-geometry.ts';
import type { Point } from '../sketch/connector-geometry.ts';
import type { SequenceMessage, SequenceNote, SequenceParticipant } from './sequence-model.ts';

export interface PositionedParticipant {
  participant: SequenceParticipant;
  node: ComponentNode;
  box: Box;
  centerX: number;
}

export interface PositionedMessage {
  message: SequenceMessage;
  points: Point[];
  labelBox: Box | null;
}

export interface PositionedNote {
  note: SequenceNote;
  box: Box;
}

export interface SequenceLayout {
  participants: PositionedParticipant[];
  messages: PositionedMessage[];
  notes: PositionedNote[];
  lifelineTop: number;
  lifelineBottom: number;
}
