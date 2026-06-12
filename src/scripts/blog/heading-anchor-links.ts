/**
 * Appends a hover-revealed `#` link to every article heading that has
 * an id (Astro generates the ids at build time), so readers can copy a
 * deep link to any section.
 */
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
