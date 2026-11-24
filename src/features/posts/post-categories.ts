const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  ai: 'AI',
  growth: 'Growth',
  'system-design': 'System Design',
  physics: 'Physics',
  life: 'Life',
  meta: 'Meta',
};

export const CATEGORY_ORDER: readonly string[] = ['system-design', 'ai', 'growth', 'physics', 'life', 'meta'];

export function categoryLabel(category: string): string {
  return (
    CATEGORY_LABELS[category] ??
    category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

export function categoryRank(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}
