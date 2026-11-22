import { DiagramSyntaxError } from '../../../../src/markdown/whiteboard/diagram-syntax-error';

export function captureDiagramSyntaxError(parse: () => unknown): DiagramSyntaxError {
  try {
    parse();
  } catch (error) {
    if (error instanceof DiagramSyntaxError) return error;
    throw error;
  }
  throw new Error('expected a DiagramSyntaxError');
}
