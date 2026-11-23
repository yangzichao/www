const THOUGHT_BODY_SELECTOR = '[data-thought-body]';
const HIDDEN_OVERFLOW_WORTH_COLLAPSING_PX = 80;

function overflowsWhenCollapsed(body: HTMLElement): boolean {
  body.dataset.collapsed = 'true';
  const hiddenOverflow = body.scrollHeight - body.clientHeight;
  if (hiddenOverflow > HIDDEN_OVERFLOW_WORTH_COLLAPSING_PX) return true;
  delete body.dataset.collapsed;
  return false;
}

function buildExpandToggle(body: HTMLElement): HTMLButtonElement {
  const toggle = body.ownerDocument.createElement('button');
  toggle.type = 'button';
  toggle.className = 'thought-expand';
  toggle.textContent = 'Read more';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    const isExpanding = body.dataset.collapsed === 'true';
    body.dataset.collapsed = String(!isExpanding);
    toggle.textContent = isExpanding ? 'Show less' : 'Read more';
    toggle.setAttribute('aria-expanded', String(isExpanding));
  });
  return toggle;
}

export function collapseLongThoughts(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(THOUGHT_BODY_SELECTOR).forEach((body) => {
    if (overflowsWhenCollapsed(body)) body.insertAdjacentElement('afterend', buildExpandToggle(body));
  });
}
