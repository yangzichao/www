import type { ConnectorStroke } from './flowchart-model.ts';
import type { ScanResult } from './scan-node-reference.ts';

export interface Connector {
  stroke: ConnectorStroke;
  arrowAtSource: boolean;
  arrowAtTarget: boolean;
  rawLabel: string | null;
}

interface ConnectorPattern {
  pattern: RegExp;
  stroke: ConnectorStroke;
  hasInlineLabel: boolean;
}

const CONNECTOR_PATTERNS: readonly ConnectorPattern[] = [
  { pattern: /(<)?-\.\s+(.+?)\s+\.-(>)?/y, stroke: 'dotted', hasInlineLabel: true },
  { pattern: /(<)?==\s+(.+?)\s+={2,}(>)?/y, stroke: 'thick', hasInlineLabel: true },
  { pattern: /(<)?--\s+(.+?)\s+-{2,}(>)?/y, stroke: 'solid', hasInlineLabel: true },
  { pattern: /(<)?(-\.+-)(>)?/y, stroke: 'dotted', hasInlineLabel: false },
  { pattern: /(<)?(={2,})(>)?/y, stroke: 'thick', hasInlineLabel: false },
  { pattern: /(<)?(-{2,})(>)?/y, stroke: 'solid', hasInlineLabel: false },
];

const PIPE_LABEL_PATTERN = /\s*\|([^|]*)\|/y;

function isBareTwoCharacterLine(match: RegExpExecArray, pattern: ConnectorPattern): boolean {
  return !pattern.hasInlineLabel && pattern.stroke === 'solid' && match[2] === '--' && !match[3];
}

export function scanConnector(text: string, index: number): ScanResult<Connector> | null {
  for (const candidate of CONNECTOR_PATTERNS) {
    candidate.pattern.lastIndex = index;
    const match = candidate.pattern.exec(text);
    if (!match || isBareTwoCharacterLine(match, candidate)) continue;
    let nextIndex = index + match[0].length;
    let rawLabel = candidate.hasInlineLabel ? (match[2] ?? null) : null;
    PIPE_LABEL_PATTERN.lastIndex = nextIndex;
    const pipeLabel = PIPE_LABEL_PATTERN.exec(text);
    if (pipeLabel) {
      rawLabel = pipeLabel[1] ?? '';
      nextIndex += pipeLabel[0].length;
    }
    return {
      value: {
        stroke: candidate.stroke,
        arrowAtSource: match[1] === '<',
        arrowAtTarget: match[3] === '>',
        rawLabel,
      },
      nextIndex,
    };
  }
  return null;
}
