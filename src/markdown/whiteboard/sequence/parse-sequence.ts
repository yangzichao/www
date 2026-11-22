import { DiagramSyntaxError } from '../diagram-syntax-error.ts';
import { meaningfulLinesOf, type DiagramSourceLine } from '../diagram-source-lines.ts';
import { splitLabelLines } from '../text/label-lines.ts';
import { scanMessageStatement, scanNoteStatement, scanParticipantStatement } from './scan-sequence-statement.ts';
import type { SequenceDiagram, SequenceParticipant, SequenceStep } from './sequence-model.ts';

const HEADER = 'sequenceDiagram';

class SequenceBuilder {
  private readonly participants = new Map<string, SequenceParticipant>();
  private readonly steps: SequenceStep[] = [];

  declareParticipant(id: string, rawLabel: string | null, kindHint: string | null, lineNumber: number): void {
    if (this.participants.has(id)) throw new DiagramSyntaxError(`participant "${id}" is declared twice`, lineNumber);
    this.participants.set(id, { id, labelLines: splitLabelLines(rawLabel ?? id), kindHint });
  }

  private ensureParticipant(id: string): string {
    if (!this.participants.has(id)) this.participants.set(id, { id, labelLines: [id], kindHint: null });
    return id;
  }

  private nextStepId(): string {
    return `step-${this.steps.length + 1}`;
  }

  addStatement(line: DiagramSourceLine): void {
    const participant = scanParticipantStatement(line.text);
    if (participant) {
      this.declareParticipant(participant.id, participant.rawLabel, participant.kindHint, line.lineNumber);
      return;
    }
    const message = scanMessageStatement(line.text);
    if (message) {
      this.steps.push({
        type: 'message',
        id: this.nextStepId(),
        sourceId: this.ensureParticipant(message.sourceId),
        targetId: this.ensureParticipant(message.targetId),
        labelLines: splitLabelLines(message.rawLabel),
        line: message.line,
        hasArrowhead: message.hasArrowhead,
      });
      return;
    }
    const note = scanNoteStatement(line.text);
    if (note) {
      this.steps.push({
        type: 'note',
        id: this.nextStepId(),
        participantIds: note.participantIds.map((id) => this.ensureParticipant(id)),
        placement: note.placement,
        labelLines: splitLabelLines(note.rawLabel),
      });
      return;
    }
    throw new DiagramSyntaxError(
      `unsupported sequence statement "${line.text}"; use participant, A->>B: text, A-->>B: text, or Note over A: text`,
      line.lineNumber,
    );
  }

  build(): SequenceDiagram {
    return { participants: [...this.participants.values()], steps: this.steps };
  }
}

export function parseSequence(source: string): SequenceDiagram {
  const [header, ...statements] = meaningfulLinesOf(source);
  if (header?.text !== HEADER) throw new DiagramSyntaxError(`expected \`${HEADER}\``, header?.lineNumber ?? 1);
  const builder = new SequenceBuilder();
  for (const statement of statements) builder.addStatement(statement);
  return builder.build();
}
