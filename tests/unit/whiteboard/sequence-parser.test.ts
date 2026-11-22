import { describe, expect, it } from 'vitest';
import { parseSequence } from '../../../src/markdown/whiteboard/sequence/parse-sequence';
import { captureDiagramSyntaxError } from './support/capture-diagram-syntax-error';

describe('parseSequence', () => {
  it('reads participants, messages of every arrow style, self messages and notes', () => {
    const diagram = parseSequence(
      [
        'sequenceDiagram',
        '  participant C as Browser client',
        '  actor U',
        '  participant DB:::nosql as Orders<br/>store',
        '  C->>U: ask',
        '  U-->>C: reply',
        '  C->DB: fire and forget',
        '  DB-->C: dashed, no head',
        '  C->>C: think',
        '  Note over C: one',
        '  Note over C,DB: span',
        '  note left of U: left',
        '  Note right of DB: right',
        '  C->>Late: auto-created',
      ].join('\n'),
    );

    expect(diagram.participants).toStrictEqual([
      { id: 'C', labelLines: ['Browser client'], kindHint: null },
      { id: 'U', labelLines: ['U'], kindHint: null },
      { id: 'DB', labelLines: ['Orders', 'store'], kindHint: 'nosql' },
      { id: 'Late', labelLines: ['Late'], kindHint: null },
    ]);
    expect(diagram.steps).toStrictEqual([
      {
        type: 'message',
        id: 'step-1',
        sourceId: 'C',
        targetId: 'U',
        labelLines: ['ask'],
        line: 'solid',
        hasArrowhead: true,
      },
      {
        type: 'message',
        id: 'step-2',
        sourceId: 'U',
        targetId: 'C',
        labelLines: ['reply'],
        line: 'dashed',
        hasArrowhead: true,
      },
      {
        type: 'message',
        id: 'step-3',
        sourceId: 'C',
        targetId: 'DB',
        labelLines: ['fire and forget'],
        line: 'solid',
        hasArrowhead: false,
      },
      {
        type: 'message',
        id: 'step-4',
        sourceId: 'DB',
        targetId: 'C',
        labelLines: ['dashed, no head'],
        line: 'dashed',
        hasArrowhead: false,
      },
      {
        type: 'message',
        id: 'step-5',
        sourceId: 'C',
        targetId: 'C',
        labelLines: ['think'],
        line: 'solid',
        hasArrowhead: true,
      },
      { type: 'note', id: 'step-6', participantIds: ['C'], placement: 'over', labelLines: ['one'] },
      { type: 'note', id: 'step-7', participantIds: ['C', 'DB'], placement: 'over', labelLines: ['span'] },
      { type: 'note', id: 'step-8', participantIds: ['U'], placement: 'leftOf', labelLines: ['left'] },
      { type: 'note', id: 'step-9', participantIds: ['DB'], placement: 'rightOf', labelLines: ['right'] },
      {
        type: 'message',
        id: 'step-10',
        sourceId: 'C',
        targetId: 'Late',
        labelLines: ['auto-created'],
        line: 'solid',
        hasArrowhead: true,
      },
    ]);
  });

  it.each([
    ['flowchart LR\n  A --> B', 1, 'expected `sequenceDiagram`'],
    ['', 1, 'expected `sequenceDiagram`'],
    ['sequenceDiagram\n  participant A\n  participant A', 3, 'participant "A" is declared twice'],
    [
      'sequenceDiagram\n  A->>B: hi\n  loop every second',
      3,
      'unsupported sequence statement "loop every second"; use participant, A->>B: text, A-->>B: text, or Note over A: text',
    ],
  ])('rejects %j at line %i', (source, lineNumber, reason) => {
    expect(captureDiagramSyntaxError(() => parseSequence(source))).toMatchObject({ lineNumber, reason });
  });
});
