import { getCollection, type CollectionEntry } from 'astro:content';

export type Thought = CollectionEntry<'thoughts'>;

export async function getThoughts(): Promise<Thought[]> {
  const all = await getCollection('thoughts');
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function formatThoughtDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatThoughtMonth(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
