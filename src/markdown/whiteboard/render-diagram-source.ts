import { DiagramSyntaxError } from './diagram-syntax-error.ts';
import { meaningfulLinesOf } from './diagram-source-lines.ts';
import { renderFlowchart } from './flowchart/render-flowchart.ts';
import { renderSequence } from './sequence/render-sequence.ts';

const FLOWCHART_HEADER_PATTERN = /^(?:flowchart|graph)\b/;
const SEQUENCE_HEADER = 'sequenceDiagram';

export async function renderDiagramSource(source: string, diagramId: string): Promise<string> {
  const header = meaningfulLinesOf(source)[0];
  if (header && FLOWCHART_HEADER_PATTERN.test(header.text)) return renderFlowchart(source, diagramId);
  if (header?.text === SEQUENCE_HEADER) return renderSequence(source, diagramId);
  throw new DiagramSyntaxError(
    'only `flowchart` and `sequenceDiagram` diagrams are supported',
    header?.lineNumber ?? 1,
  );
}
