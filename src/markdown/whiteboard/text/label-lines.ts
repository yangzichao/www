const LINE_BREAK_PATTERN = /<br\s*\/?>/gi;

function withoutSurroundingQuotes(label: string): string {
  if (label.length >= 2 && label.startsWith('"') && label.endsWith('"')) return label.slice(1, -1);
  return label;
}

export function splitLabelLines(rawLabel: string): string[] {
  return withoutSurroundingQuotes(rawLabel.trim())
    .split(LINE_BREAK_PATTERN)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
