export type MessageLine = 'solid' | 'dashed';

export type NotePlacement = 'over' | 'leftOf' | 'rightOf';

export interface SequenceParticipant {
  id: string;
  labelLines: string[];
  kindHint: string | null;
}

export interface SequenceMessage {
  type: 'message';
  id: string;
  sourceId: string;
  targetId: string;
  labelLines: string[];
  line: MessageLine;
  hasArrowhead: boolean;
}

export interface SequenceNote {
  type: 'note';
  id: string;
  participantIds: string[];
  placement: NotePlacement;
  labelLines: string[];
}

export type SequenceStep = SequenceMessage | SequenceNote;

export interface SequenceDiagram {
  participants: SequenceParticipant[];
  steps: SequenceStep[];
}
