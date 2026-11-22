import { describe, expect, it } from 'vitest';
import { findFeedbackEdgeIds } from '../../../src/markdown/whiteboard/flowchart/find-feedback-edges';
import { parseFlowchart } from '../../../src/markdown/whiteboard/flowchart/parse-flowchart';

function feedbackEdges(source: string): string[] {
  const graph = parseFlowchart(source);
  const ids = findFeedbackEdgeIds(graph);
  return graph.edges.filter((edge) => ids.has(edge.id)).map((edge) => `${edge.sourceId}->${edge.targetId}`);
}

describe('findFeedbackEdgeIds', () => {
  it('reverses only the edge that closes a cycle, walking from the first declared node', () => {
    expect(feedbackEdges('flowchart TD\n  C --> GW --> SEQ --> LOG --> E --> MD\n  MD --> C')).toStrictEqual(['MD->C']);
  });

  it('keeps acyclic graphs and self loops untouched', () => {
    expect(feedbackEdges('flowchart LR\n  A --> B --> C\n  A --> C\n  B --> B')).toStrictEqual([]);
  });

  it('marks the second edge of a two-way pair and handles edges that start at a subgraph', () => {
    expect(feedbackEdges('flowchart LR\n  A --> B\n  B --> A\n  subgraph S\n    X\n  end\n  S --> A')).toStrictEqual([
      'B->A',
    ]);
  });
});
