import type { ColumnSpacingRule } from './sequence-columns.ts';
import { messageSpanWidth, NOTE_SIDE_GAP, noteSize, selfMessageWidth } from './sequence-metrics.ts';
import type { SequenceMessage, SequenceNote, SequenceStep } from './sequence-model.ts';

function messageRule(message: SequenceMessage, columnOf: (id: string) => number): ColumnSpacingRule | null {
  const source = columnOf(message.sourceId);
  const target = columnOf(message.targetId);
  if (source === target) {
    return { leftIndex: source, rightIndex: source + 1, minimumDistance: selfMessageWidth(message.labelLines) };
  }
  return {
    leftIndex: Math.min(source, target),
    rightIndex: Math.max(source, target),
    minimumDistance: messageSpanWidth(message.labelLines),
  };
}

function sideNoteRule(note: SequenceNote, columnOf: (id: string) => number): ColumnSpacingRule | null {
  const [participantId] = note.participantIds;
  if (participantId === undefined || note.placement === 'over') return null;
  const column = columnOf(participantId);
  const minimumDistance = noteSize(note.labelLines).width + NOTE_SIDE_GAP * 2;
  return note.placement === 'rightOf'
    ? { leftIndex: column, rightIndex: column + 1, minimumDistance }
    : { leftIndex: column - 1, rightIndex: column, minimumDistance };
}

export function spacingRulesFor(steps: readonly SequenceStep[], columnOf: (id: string) => number): ColumnSpacingRule[] {
  return steps.flatMap((step) => {
    const rule = step.type === 'message' ? messageRule(step, columnOf) : sideNoteRule(step, columnOf);
    return rule ? [rule] : [];
  });
}
