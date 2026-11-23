export type FieldReader = Record<string, unknown>;

export function readTrimmedString(fields: FieldReader, key: string): string {
  const value = fields[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function readOptionalText(fields: FieldReader, key: string): string | null {
  const text = readTrimmedString(fields, key);
  return text.length > 0 ? text : null;
}

export function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
