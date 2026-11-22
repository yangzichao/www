export interface ColumnSpacingRule {
  leftIndex: number;
  rightIndex: number;
  minimumDistance: number;
}

const COLUMN_GAP = 48;

function initialCenters(columnWidths: readonly number[]): number[] {
  const centers: number[] = [];
  columnWidths.forEach((width, index) => {
    const previousCenter = centers[index - 1];
    const previousWidth = columnWidths[index - 1] ?? 0;
    centers.push(
      previousCenter === undefined ? width / 2 : previousCenter + previousWidth / 2 + COLUMN_GAP + width / 2,
    );
  });
  return centers;
}

function byNarrowestSpanFirst(first: ColumnSpacingRule, second: ColumnSpacingRule): number {
  const spanDifference = first.rightIndex - first.leftIndex - (second.rightIndex - second.leftIndex);
  return spanDifference === 0 ? first.leftIndex - second.leftIndex : spanDifference;
}

export function columnCenters(columnWidths: readonly number[], rules: readonly ColumnSpacingRule[]): number[] {
  const centers = initialCenters(columnWidths);
  for (const rule of [...rules].sort(byNarrowestSpanFirst)) {
    const left = centers[rule.leftIndex];
    const right = centers[rule.rightIndex];
    if (left === undefined || right === undefined) continue;
    const deficit = rule.minimumDistance - (right - left);
    if (deficit <= 0) continue;
    for (let index = rule.rightIndex; index < centers.length; index += 1) {
      centers[index] = (centers[index] ?? 0) + deficit;
    }
  }
  return centers;
}
