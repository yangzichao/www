import { describe, expect, it } from 'vitest';
import { initFocusSearchShortcut } from '../../../src/scripts/content-view/focus-search-shortcut';
import { collapseLongThoughts } from '../../../src/scripts/thoughts/collapse-long-thoughts';

function requireElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

function pressKey(target: EventTarget, key: string, modifiers: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
  target.dispatchEvent(event);
  return event;
}

describe('initFocusSearchShortcut', () => {
  function renderSearchPage() {
    document.body.innerHTML = `
      <input data-content-search value="ai" />
      <textarea aria-label="Draft"></textarea>
      <p tabindex="0">Body</p>`;
    initFocusSearchShortcut(document);
    return document.querySelector<HTMLInputElement>('[data-content-search]');
  }

  it('focuses the search box when slash is pressed outside a text field', () => {
    const searchInput = renderSearchPage();
    const event = pressKey(document.body, '/');

    expect(document.activeElement).toBe(searchInput);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves slash alone while typing or when a modifier is held', () => {
    renderSearchPage();
    const draft = requireElement('textarea');

    expect(pressKey(draft, '/').defaultPrevented).toBe(false);
    expect(pressKey(document.body, '/', { metaKey: true }).defaultPrevented).toBe(false);
    expect(pressKey(document.body, 'k').defaultPrevented).toBe(false);
  });

  it('does nothing on a page without a search box', () => {
    document.body.innerHTML = '<p>No search</p>';
    initFocusSearchShortcut(document);

    expect(pressKey(document.body, '/').defaultPrevented).toBe(false);
  });
});

describe('collapseLongThoughts', () => {
  function renderThoughtBodies(heights: { scrollHeight: number; clientHeight: number }[]) {
    document.body.innerHTML = heights.map((_, index) => `<div data-thought-body id="body-${index}"></div>`).join('');
    const bodies = [...document.querySelectorAll<HTMLElement>('[data-thought-body]')];
    bodies.forEach((body, index) => {
      Object.defineProperty(body, 'scrollHeight', { value: heights[index]?.scrollHeight });
      Object.defineProperty(body, 'clientHeight', { value: heights[index]?.clientHeight });
    });
    collapseLongThoughts(document);
    return bodies;
  }

  it('collapses only thoughts that overflow well past the collapsed height', () => {
    const [longBody, shortBody] = renderThoughtBodies([
      { scrollHeight: 900, clientHeight: 350 },
      { scrollHeight: 400, clientHeight: 350 },
    ]);

    expect(longBody?.dataset.collapsed).toBe('true');
    expect(shortBody?.dataset.collapsed).toBeUndefined();
    expect(document.querySelectorAll('.thought-expand')).toHaveLength(1);
  });

  it('toggles between the collapsed and expanded body', () => {
    const [longBody] = renderThoughtBodies([{ scrollHeight: 900, clientHeight: 350 }]);
    const toggle = requireElement('.thought-expand');
    toggle.click();

    expect([longBody?.dataset.collapsed, toggle.textContent, toggle.getAttribute('aria-expanded')]).toStrictEqual([
      'false',
      'Show less',
      'true',
    ]);

    toggle.click();

    expect([longBody?.dataset.collapsed, toggle.textContent, toggle.getAttribute('aria-expanded')]).toStrictEqual([
      'true',
      'Read more',
      'false',
    ]);
  });
});
