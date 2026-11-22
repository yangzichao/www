import { isComponentKind, type ComponentKind } from '../components/component-kind.ts';
import { inferComponentKind } from '../components/infer-component-kind.ts';
import type { SequenceParticipant } from './sequence-model.ts';

export function resolveParticipantKind(participant: SequenceParticipant): ComponentKind {
  if (participant.kindHint && isComponentKind(participant.kindHint)) return participant.kindHint;
  return inferComponentKind(participant.labelLines[0] ?? participant.id);
}
