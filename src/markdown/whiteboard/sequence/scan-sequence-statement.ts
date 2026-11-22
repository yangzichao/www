import type { MessageLine, NotePlacement } from './sequence-model.ts';

const IDENTIFIER = String.raw`[\p{L}\p{N}_]+`;

const PARTICIPANT_PATTERN = new RegExp(
  String.raw`^(?:participant|actor)\s+(${IDENTIFIER})(?::::(\w+))?(?:\s+as\s+(.+))?$`,
  'u',
);
const MESSAGE_PATTERN = new RegExp(String.raw`^(${IDENTIFIER})\s*(-->>|->>|-->|->)\s*(${IDENTIFIER})\s*:\s*(.*)$`, 'u');
const NOTE_PATTERN = new RegExp(
  String.raw`^note\s+(over|left of|right of)\s+(${IDENTIFIER})(?:\s*,\s*(${IDENTIFIER}))?\s*:\s*(.*)$`,
  'iu',
);

export interface ParticipantStatement {
  id: string;
  kindHint: string | null;
  rawLabel: string | null;
}

export interface MessageStatement {
  sourceId: string;
  targetId: string;
  rawLabel: string;
  line: MessageLine;
  hasArrowhead: boolean;
}

export interface NoteStatement {
  participantIds: string[];
  placement: NotePlacement;
  rawLabel: string;
}

const NOTE_PLACEMENTS: Record<string, NotePlacement> = { over: 'over', 'left of': 'leftOf', 'right of': 'rightOf' };

export function scanParticipantStatement(text: string): ParticipantStatement | null {
  const match = PARTICIPANT_PATTERN.exec(text);
  if (!match?.[1]) return null;
  return { id: match[1], kindHint: match[2] ?? null, rawLabel: match[3] ?? null };
}

export function scanMessageStatement(text: string): MessageStatement | null {
  const match = MESSAGE_PATTERN.exec(text);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const arrow = match[2];
  return {
    sourceId: match[1],
    targetId: match[3],
    rawLabel: match[4] ?? '',
    line: arrow.startsWith('--') ? 'dashed' : 'solid',
    hasArrowhead: arrow.endsWith('>>'),
  };
}

export function scanNoteStatement(text: string): NoteStatement | null {
  const match = NOTE_PATTERN.exec(text);
  if (!match?.[1] || !match[2]) return null;
  return {
    participantIds: match[3] ? [match[2], match[3]] : [match[2]],
    placement: NOTE_PLACEMENTS[match[1].toLowerCase()] ?? 'over',
    rawLabel: match[4] ?? '',
  };
}
