import type { SequenceDiagram, SequenceNote } from './sequence-model.ts';

const TITLE_PARTICIPANT_LIMIT = 5;

const NOTE_PLACEMENT_WORDS: Record<SequenceNote['placement'], string> = {
  over: 'over',
  leftOf: 'left of',
  rightOf: 'right of',
};

export function sequenceTitle(diagram: SequenceDiagram): string {
  const names = diagram.participants
    .slice(0, TITLE_PARTICIPANT_LIMIT)
    .map((participant) => participant.labelLines.join(' '));
  const more = diagram.participants.length > TITLE_PARTICIPANT_LIMIT ? ', …' : '';
  return `Sequence diagram: ${names.join(', ')}${more}`;
}

export function sequenceDescription(diagram: SequenceDiagram): string {
  const nameOf = new Map(diagram.participants.map((participant) => [participant.id, participant.labelLines.join(' ')]));
  const name = (id: string): string => nameOf.get(id) ?? id;
  return diagram.steps
    .map((step) => {
      const text = step.labelLines.join(' ');
      if (step.type === 'note') {
        return `Note ${NOTE_PLACEMENT_WORDS[step.placement]} ${step.participantIds.map(name).join(', ')}: ${text}`;
      }
      const arrow = step.line === 'dashed' ? '⇢' : '→';
      return `${name(step.sourceId)} ${arrow} ${name(step.targetId)}: ${text}`;
    })
    .join('; ');
}
