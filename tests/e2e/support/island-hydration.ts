import { expect, type Locator } from '@playwright/test';

export async function waitUntilIslandHydrated(controlInsideIsland: Locator): Promise<void> {
  await controlInsideIsland.scrollIntoViewIfNeeded();
  const enclosingIsland = controlInsideIsland.locator('xpath=ancestor::astro-island[1]');
  await expect(enclosingIsland).not.toHaveAttribute('ssr');
}
