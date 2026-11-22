import { vi } from 'vitest';

type EntryFilter = (entry: unknown) => boolean;

const collectionEntries = new Map<string, readonly unknown[]>();

export function setCollectionEntries(collection: string, entries: readonly unknown[]): void {
  collectionEntries.set(collection, entries);
}

export const getCollection = vi.fn((collection: string, filter?: EntryFilter) =>
  Promise.resolve((collectionEntries.get(collection) ?? []).filter((entry) => filter?.(entry) ?? true)),
);
