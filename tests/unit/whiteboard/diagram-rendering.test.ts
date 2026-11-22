import { describe, expect, it } from 'vitest';
import { glyphMarkup } from '../../../src/markdown/whiteboard/components/component-glyphs';
import { unionBounds } from '../../../src/markdown/whiteboard/diagram-figure';
import { renderDiagramSource } from '../../../src/markdown/whiteboard/render-diagram-source';
import { connectorMarkup } from '../../../src/markdown/whiteboard/sketch/connector-markup';

const EVERY_KIND_FLOWCHART = [
  'flowchart LR',
  '  U[Mobile clients] --> CDN[Edge CDN] --> LB[Load balancer] --> API[API gateway]',
  '  API --> SVC[Feed service] --> C[(Redis cache)]',
  '  SVC --> DB[(Postgres)] & N[(DynamoDB)] & S3[(S3 bucket)] & ES[(Search index)]',
  '  SVC -.-> Q[Job queue] ==> W[Worker pool] --> K[Kafka stream]',
  '  W --> G[GPU inference worker] & SB[Code sandbox] & CR[Cron scheduler]',
  '  W <--> X[Stripe]',
  '  W --> P1([Pill step]) --> P2[[Subroutine step]] --> P3((Circle step))',
  '  P3 --> P4{Decision} --> P5{{Hex step}} --> P6[/Lean step/]',
].join('\n');

const SUBGRAPH_FLOWCHART = [
  'flowchart TD',
  '  subgraph Clients[Client zone]',
  '    direction LR',
  '    A[Writer] --> B[Reader]',
  '  end',
  '  subgraph Backend',
  '    C[Room service]',
  '  end',
  '  Clients --> Backend',
].join('\n');

const CROSSING_SUBGRAPH_FLOWCHART = [
  'flowchart LR',
  '  subgraph Write[Write path]',
  '    A[API] --> B[(Reviews)]',
  '  end',
  '  subgraph Read[Read path]',
  '    C[Ranker]',
  '  end',
  '  B -->|events| C',
].join('\n');

const SEQUENCE = [
  'sequenceDiagram',
  '  participant A as Alice 客户端',
  '  participant S as Room',
  '  A->>A: apply locally',
  '  A->>S: op <b>&</b>',
  '  Note over S: order<br/>transform',
  '  S-->>A: ack',
].join('\n');

describe('renderDiagramSource', () => {
  it('renders the same source to byte-identical markup every time', async () => {
    const first = await renderDiagramSource(EVERY_KIND_FLOWCHART, 'wb-test');
    const second = await renderDiagramSource(EVERY_KIND_FLOWCHART, 'wb-test');

    expect(second).toBe(first);
    await expect(renderDiagramSource(EVERY_KIND_FLOWCHART, 'wb-other')).resolves.not.toBe(first);
  });

  it('wraps flowcharts in an accessible figure with a title and an edge-by-edge description', async () => {
    const markup = await renderDiagramSource(
      'flowchart LR\n  A[Client] -->|GET| B[Server]\n  B <--> C[Peer]',
      'wb-a11y',
    );

    expect(markup).toMatch(
      /^<figure class="whiteboard-diagram" data-diagram-type="flowchart" style="--wb-natural-width: \d+px">/,
    );
    expect(markup).toContain('role="img" aria-labelledby="wb-a11y-title wb-a11y-desc"');
    expect(markup).toContain('<title id="wb-a11y-title">Diagram: Client, Server, Peer</title>');
    expect(markup).toContain('<desc id="wb-a11y-desc">Client → Server (GET); Server ↔ Peer</desc>');
    expect(markup).not.toContain('NaN');
  });

  it('draws every component kind with its own silhouette', async () => {
    const markup = await renderDiagramSource(EVERY_KIND_FLOWCHART, 'wb-kinds');
    const kinds = new Set([...markup.matchAll(/data-kind="(\w+)"/g)].map((match) => match[1]));

    expect([...kinds].sort()).toStrictEqual(
      [
        'api',
        'cache',
        'cdn',
        'client',
        'compute',
        'container',
        'db',
        'external',
        'gpu',
        'lb',
        'nosql',
        'objectstore',
        'process',
        'queue',
        'scheduler',
        'search',
        'service',
        'stream',
      ].sort(),
    );
    expect(markup).toContain('stroke-dasharray="7 6"');
    expect(markup).toContain('<g class="wb-glyph"');
    expect(markup).toContain('<circle');
    expect(markup).toContain('Diagram: Mobile clients, Edge CDN, Load balancer, API gateway, Feed service, …');
  });

  it('draws subgraphs as titled zones, both nested-direction and edge-crossing layouts', async () => {
    const separate = await renderDiagramSource(SUBGRAPH_FLOWCHART, 'wb-groups');
    const crossing = await renderDiagramSource(CROSSING_SUBGRAPH_FLOWCHART, 'wb-crossing');

    expect(separate.match(/class="wb-group"/g)).toHaveLength(2);
    expect(separate).toContain('>Client zone</text>');
    expect(separate).toContain('Client zone → Backend');
    expect(crossing).toContain('>Write path</text>');
    expect(crossing).toContain('class="wb-connector-label"');
  });

  it('renders sequence diagrams with lifelines, notes and escaped labels', async () => {
    const markup = await renderDiagramSource(SEQUENCE, 'wb-seq');

    expect(markup).toContain('data-diagram-type="sequence"');
    expect(markup).toContain('<title id="wb-seq-title">Sequence diagram: Alice 客户端, Room</title>');
    expect(markup).toContain('Alice 客户端 → Room: op &lt;b&gt;&amp;&lt;/b&gt;');
    expect(markup).toContain('Note over Room: order transform');
    expect(markup).toContain('Room ⇢ Alice 客户端: ack');
    expect(markup).toContain('class="wb-note"');
    expect(markup).not.toContain('<b>');
  });

  it('shortens long sequence titles', async () => {
    const markup = await renderDiagramSource(
      'sequenceDiagram\n  A->>B: 1\n  B->>C: 2\n  C->>D: 3\n  D->>E: 4\n  E->>F: 5',
      'wb-long',
    );

    expect(markup).toContain('Sequence diagram: A, B, C, D, E, …');
  });

  it('rejects diagram types it does not draw', async () => {
    await expect(renderDiagramSource('pie title Pets\n  "Dogs" : 3', 'wb-pie')).rejects.toMatchObject({
      lineNumber: 1,
      reason: 'only `flowchart` and `sequenceDiagram` diagrams are supported',
    });
  });

  it('reports an empty diagram on line 1', async () => {
    await expect(renderDiagramSource('', 'wb-empty')).rejects.toMatchObject({ lineNumber: 1 });
  });
});

describe('drawing helpers', () => {
  it('draws nothing for a connector with fewer than two points', () => {
    expect(
      connectorMarkup({ points: [{ x: 0, y: 0 }], line: 'solid', arrowAtStart: true, arrowAtEnd: true, seed: 1 }),
    ).toBe('');
  });

  it('measures empty bounds as a zero box', () => {
    expect(unionBounds([])).toStrictEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('draws no glyph for kinds without one', () => {
    expect(glyphMarkup('process', 0, 0)).toBe('');
  });
});
