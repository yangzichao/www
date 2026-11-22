export class DiagramSyntaxError extends Error {
  readonly lineNumber: number;
  readonly reason: string;

  constructor(reason: string, lineNumber: number) {
    super(`Diagram line ${lineNumber}: ${reason}`);
    this.name = 'DiagramSyntaxError';
    this.lineNumber = lineNumber;
    this.reason = reason;
  }
}
