const SEARCH_SHORTCUT_KEY = '/';
const SEARCH_INPUT_SELECTOR = '[data-content-search]';

function isTypingInto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function usesModifierKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}

export function initFocusSearchShortcut(root: Document): void {
  root.addEventListener('keydown', (event) => {
    if (event.key !== SEARCH_SHORTCUT_KEY || usesModifierKey(event) || isTypingInto(event.target)) return;
    const searchInput = root.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR);
    if (!searchInput) return;
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  });
}
