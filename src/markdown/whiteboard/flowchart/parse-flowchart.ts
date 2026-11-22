import { DiagramSyntaxError } from '../diagram-syntax-error.ts';
import { meaningfulLinesOf, type DiagramSourceLine } from '../diagram-source-lines.ts';
import { splitLabelLines } from '../text/label-lines.ts';
import type { FlowDirection, FlowchartEdge, FlowchartGraph, FlowchartGroup, FlowchartNode } from './flowchart-model.ts';
import { scanConnector, type Connector } from './scan-connector.ts';
import { scanNodeReference, type NodeReference } from './scan-node-reference.ts';

const HEADER_PATTERN = /^(?:flowchart|graph)(?:\s+(LR|RL|TB|TD|BT))?$/;
const DIRECTION_PATTERN = /^direction\s+(LR|RL|TB|TD|BT)$/;
const SUBGRAPH_WITH_LABEL_PATTERN = /^([\p{L}\p{N}_]+)\s*\[(.+)\]$/u;
const SUBGRAPH_ID_ONLY_PATTERN = /^[\p{L}\p{N}_]+$/u;
const UNSUPPORTED_STATEMENT_PATTERN = /^(classDef|class|style|linkStyle|click)\b/;

const DIRECTION_ALIASES: Record<string, FlowDirection> = { LR: 'LR', RL: 'RL', TB: 'TB', TD: 'TB', BT: 'BT' };

function normalizeDirection(direction: string | undefined): FlowDirection {
  return DIRECTION_ALIASES[direction ?? 'TB'] ?? 'TB';
}

class FlowchartBuilder {
  private readonly nodes = new Map<string, FlowchartNode>();
  private readonly edges: FlowchartEdge[] = [];
  private readonly groups: FlowchartGroup[] = [];
  private readonly openGroups: FlowchartGroup[] = [];
  private direction: FlowDirection = 'TB';

  setHeaderDirection(direction: FlowDirection): void {
    this.direction = direction;
  }

  openGroup(rest: string): void {
    const parent = this.openGroups.at(-1) ?? null;
    const generatedId = `group-${this.groups.length + 1}`;
    const withLabel = SUBGRAPH_WITH_LABEL_PATTERN.exec(rest);
    const isIdOnly = SUBGRAPH_ID_ONLY_PATTERN.test(rest);
    const group: FlowchartGroup = {
      id: withLabel?.[1] ?? (isIdOnly ? rest : generatedId),
      labelLines: splitLabelLines(withLabel?.[2] ?? rest),
      direction: null,
      parentGroupId: parent?.id ?? null,
    };
    this.groups.push(group);
    this.openGroups.push(group);
  }

  closeGroup(lineNumber: number): void {
    if (!this.openGroups.pop()) throw new DiagramSyntaxError('`end` without an open `subgraph`', lineNumber);
  }

  setGroupDirection(direction: FlowDirection, lineNumber: number): void {
    const group = this.openGroups.at(-1);
    if (!group) throw new DiagramSyntaxError('`direction` is only supported inside a `subgraph`', lineNumber);
    group.direction = direction;
  }

  registerNode(reference: NodeReference): string {
    const existing = this.nodes.get(reference.id);
    if (existing) {
      if (reference.rawLabel !== null) existing.labelLines = splitLabelLines(reference.rawLabel);
      if (reference.shape) existing.shape = reference.shape;
      if (reference.kindHint) existing.kindHint = reference.kindHint;
      return existing.id;
    }
    this.nodes.set(reference.id, {
      id: reference.id,
      labelLines: splitLabelLines(reference.rawLabel ?? reference.id),
      shape: reference.shape ?? 'rectangle',
      kindHint: reference.kindHint,
      groupId: this.openGroups.at(-1)?.id ?? null,
    });
    return reference.id;
  }

  connect(sourceIds: readonly string[], connector: Connector, targetIds: readonly string[]): void {
    for (const sourceId of sourceIds) {
      for (const targetId of targetIds) {
        this.edges.push({
          id: `edge-${this.edges.length + 1}`,
          sourceId,
          targetId,
          labelLines: connector.rawLabel === null ? [] : splitLabelLines(connector.rawLabel),
          stroke: connector.stroke,
          arrowAtSource: connector.arrowAtSource,
          arrowAtTarget: connector.arrowAtTarget,
        });
      }
    }
  }

  build(lastLineNumber: number): FlowchartGraph {
    if (this.openGroups.length > 0) throw new DiagramSyntaxError('`subgraph` is missing its `end`', lastLineNumber);
    const groupIds = new Set(this.groups.map((group) => group.id));
    return {
      direction: this.direction,
      nodes: [...this.nodes.values()].filter((node) => !groupIds.has(node.id)),
      edges: this.edges,
      groups: this.groups,
    };
  }
}

function skipSpaces(text: string, index: number): number {
  let cursor = index;
  while (text[cursor] === ' ' || text[cursor] === '\t') cursor += 1;
  return cursor;
}

function scanNodeGroup(builder: FlowchartBuilder, line: DiagramSourceLine, index: number) {
  const ids: string[] = [];
  let cursor = index;
  for (;;) {
    const reference = scanNodeReference(line.text, skipSpaces(line.text, cursor));
    if (!reference) throw new DiagramSyntaxError(`cannot read a node at "${line.text.slice(cursor)}"`, line.lineNumber);
    ids.push(builder.registerNode(reference.value));
    cursor = skipSpaces(line.text, reference.nextIndex);
    if (line.text[cursor] !== '&') return { ids, nextIndex: cursor };
    cursor += 1;
  }
}

function parseConnectionStatement(builder: FlowchartBuilder, line: DiagramSourceLine): void {
  let group = scanNodeGroup(builder, line, 0);
  while (group.nextIndex < line.text.length) {
    const connector = scanConnector(line.text, group.nextIndex);
    if (!connector) {
      throw new DiagramSyntaxError(`expected a connector at "${line.text.slice(group.nextIndex)}"`, line.lineNumber);
    }
    const targets = scanNodeGroup(builder, line, connector.nextIndex);
    builder.connect(group.ids, connector.value, targets.ids);
    group = targets;
  }
}

function parseStatement(builder: FlowchartBuilder, line: DiagramSourceLine): void {
  if (line.text === 'end') {
    builder.closeGroup(line.lineNumber);
    return;
  }
  if (line.text.startsWith('subgraph ')) {
    builder.openGroup(line.text.slice('subgraph '.length).trim());
    return;
  }
  const direction = DIRECTION_PATTERN.exec(line.text);
  if (direction) {
    builder.setGroupDirection(normalizeDirection(direction[1]), line.lineNumber);
    return;
  }
  const unsupported = UNSUPPORTED_STATEMENT_PATTERN.exec(line.text);
  if (unsupported) {
    throw new DiagramSyntaxError(
      `\`${unsupported[1] ?? ''}\` is not supported; use \`:::kind\` on a node instead`,
      line.lineNumber,
    );
  }
  parseConnectionStatement(builder, line);
}

export function parseFlowchart(source: string): FlowchartGraph {
  const [header, ...statements] = meaningfulLinesOf(source);
  const headerMatch = header ? HEADER_PATTERN.exec(header.text) : null;
  if (!header || !headerMatch)
    throw new DiagramSyntaxError('expected `flowchart <direction>`', header?.lineNumber ?? 1);
  const builder = new FlowchartBuilder();
  builder.setHeaderDirection(normalizeDirection(headerMatch[1]));
  for (const statement of statements) parseStatement(builder, statement);
  return builder.build(statements.at(-1)?.lineNumber ?? header.lineNumber);
}
