export interface DiagramSourceLine {
  text: string;
  lineNumber: number;
}

const COMMENT_PREFIX = '%%';

export function meaningfulLinesOf(source: string): DiagramSourceLine[] {
  return source.split('\n').flatMap((rawLine, index) => {
    const text = rawLine.trim().replace(/;$/, '').trim();
    if (text.length === 0 || text.startsWith(COMMENT_PREFIX)) return [];
    return [{ text, lineNumber: index + 1 }];
  });
}
