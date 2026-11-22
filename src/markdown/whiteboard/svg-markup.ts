const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? character);
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundNumbersInPath(pathData: string): string {
  return pathData.replace(/-?\d+\.\d+/g, (number) => String(roundCoordinate(Number(number))));
}

export function stableHash(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
