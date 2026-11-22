export function initHeadingAnchorLinks(): void {
  const headings = document.querySelectorAll<HTMLElement>(
    '.post-article h2[id], .post-article h3[id], .post-article h4[id]'
  );

  headings.forEach((heading) => {
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${heading.id}`;
    anchor.setAttribute('aria-label', `Link to “${heading.textContent ?? heading.id}”`);
    anchor.textContent = '#';
    heading.appendChild(anchor);
  });
}
