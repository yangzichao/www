import { describe, expect, it } from 'vitest';
import { parseFlowchart } from '../../../src/markdown/whiteboard/flowchart/parse-flowchart';
import { captureDiagramSyntaxError } from './support/capture-diagram-syntax-error';

describe('parseFlowchart', () => {
  it('reads the header direction, treating TD and a missing direction as top-to-bottom', () => {
    expect(parseFlowchart('flowchart LR\n  A --> B').direction).toBe('LR');
    expect(parseFlowchart('graph TD\n  A --> B').direction).toBe('TB');
    expect(parseFlowchart('flowchart\n  A --> B').direction).toBe('TB');
    expect(parseFlowchart('flowchart BT\n  A --> B').direction).toBe('BT');
  });

  it('reads every node shape, quoted labels, line breaks and kind hints', () => {
    const graph = parseFlowchart(
      [
        'flowchart LR',
        '  %% comment lines are skipped',
        '  A[Rect] --> B(Rounded)',
        '  C([Stadium]) --> D[[Subroutine]]',
        '  E[(Store)] --> F((Circle))',
        '  G{Decision} --> H{{Hex}}',
        '  I[/Lean/] --> J[\\Lean back\\]',
        '  K>Flag] --> L["Quoted <br/> label"]:::cache;',
        '  M',
      ].join('\n'),
    );

    expect(graph.nodes.map((node) => [node.id, node.shape, node.labelLines, node.kindHint])).toStrictEqual([
      ['A', 'rectangle', ['Rect'], null],
      ['B', 'rounded', ['Rounded'], null],
      ['C', 'stadium', ['Stadium'], null],
      ['D', 'subroutine', ['Subroutine'], null],
      ['E', 'cylinder', ['Store'], null],
      ['F', 'circle', ['Circle'], null],
      ['G', 'diamond', ['Decision'], null],
      ['H', 'hexagon', ['Hex'], null],
      ['I', 'parallelogram', ['Lean'], null],
      ['J', 'parallelogram', ['Lean back'], null],
      ['K', 'asymmetric', ['Flag'], null],
      ['L', 'rectangle', ['Quoted', 'label'], 'cache'],
      ['M', 'rectangle', ['M'], null],
    ]);
  });

  it('reads connector strokes, arrowheads, pipe labels, inline labels, chains and & groups', () => {
    const graph = parseFlowchart(
      [
        'flowchart LR',
        '  A --> B -.-> C',
        '  C <--> D ==> E',
        '  E -->|pipe label| F',
        '  F -- inline label --> G',
        '  G -. dotted label .-> H',
        '  H == thick label ==> I',
        '  I --- J',
        '  J & K --> L & M',
      ].join('\n'),
    );

    expect(
      graph.edges.map((edge) => [
        edge.sourceId,
        edge.targetId,
        edge.stroke,
        edge.arrowAtSource,
        edge.arrowAtTarget,
        edge.labelLines,
      ]),
    ).toStrictEqual([
      ['A', 'B', 'solid', false, true, []],
      ['B', 'C', 'dotted', false, true, []],
      ['C', 'D', 'solid', true, true, []],
      ['D', 'E', 'thick', false, true, []],
      ['E', 'F', 'solid', false, true, ['pipe label']],
      ['F', 'G', 'solid', false, true, ['inline label']],
      ['G', 'H', 'dotted', false, true, ['dotted label']],
      ['H', 'I', 'thick', false, true, ['thick label']],
      ['I', 'J', 'solid', false, false, []],
      ['J', 'L', 'solid', false, true, []],
      ['J', 'M', 'solid', false, true, []],
      ['K', 'L', 'solid', false, true, []],
      ['K', 'M', 'solid', false, true, []],
    ]);
  });

  it('updates a node label when a later reference gives one', () => {
    const graph = parseFlowchart('flowchart LR\n  A --> B\n  B[(Orders DB)]:::db --> C');

    expect(graph.nodes.find((node) => node.id === 'B')).toMatchObject({
      labelLines: ['Orders DB'],
      shape: 'cylinder',
      kindHint: 'db',
    });
  });

  it('builds nested subgraphs with their own direction and lets edges target a subgraph', () => {
    const graph = parseFlowchart(
      [
        'flowchart TD',
        '  subgraph Outer[Outer zone]',
        '    direction LR',
        '    A --> B',
        '    subgraph Inner',
        '      C',
        '    end',
        '  end',
        '  subgraph Two words here',
        '    D',
        '  end',
        '  Outer --> D',
      ].join('\n'),
    );

    expect(graph.groups).toStrictEqual([
      { id: 'Outer', labelLines: ['Outer zone'], direction: 'LR', parentGroupId: null },
      { id: 'Inner', labelLines: ['Inner'], direction: null, parentGroupId: 'Outer' },
      { id: 'group-3', labelLines: ['Two words here'], direction: null, parentGroupId: null },
    ]);
    expect(graph.nodes.map((node) => [node.id, node.groupId])).toStrictEqual([
      ['A', 'Outer'],
      ['B', 'Outer'],
      ['C', 'Inner'],
      ['D', 'group-3'],
    ]);
    expect(graph.edges.at(-1)).toMatchObject({ sourceId: 'Outer', targetId: 'D' });
  });

  it.each([
    ['sequenceDiagram\n  A->>B: hi', 1, 'expected `flowchart <direction>`'],
    ['', 1, 'expected `flowchart <direction>`'],
    ['flowchart LR\n  end', 2, '`end` without an open `subgraph`'],
    ['flowchart LR\n  subgraph S\n    A', 3, '`subgraph` is missing its `end`'],
    ['flowchart LR\n  direction TB', 2, '`direction` is only supported inside a `subgraph`'],
    [
      'flowchart LR\n  A --> B\n  classDef hot fill:#f00',
      3,
      '`classDef` is not supported; use `:::kind` on a node instead',
    ],
    ['flowchart LR\n  A -- B', 2, 'expected a connector at "-- B"'],
    ['flowchart LR\n  A --> ', 2, 'cannot read a node at ""'],
    ['flowchart LR\n  A["unterminated] --> B', 2, 'cannot read a node at "A["unterminated] --> B"'],
    ['flowchart LR\n  A[open --> B', 2, 'cannot read a node at "A[open --> B"'],
    ['flowchart LR\n  A["quoted" x] --> B', 2, 'cannot read a node at "A["quoted" x] --> B"'],
  ])('rejects %j at line %i', (source, lineNumber, reason) => {
    const error = captureDiagramSyntaxError(() => parseFlowchart(source));

    expect(error.lineNumber).toBe(lineNumber);
    expect(error.reason).toBe(reason);
    expect(error.message).toBe(`Diagram line ${lineNumber}: ${reason}`);
  });
});
