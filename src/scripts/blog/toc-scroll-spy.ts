/**
 * Highlights the table-of-contents entry for the section currently in
 * view. Uses a rAF-throttled scroll listener and live offsets (instead
 * of cached ones) so late layout shifts — images, Mermaid diagrams —
 * can't desync the highlight.
 */

const CURRENT_SECTION_OFFSET_PX = 96;

export function initTocScrollSpy(): void {
  const tocContainers = document.querySelectorAll<HTMLElement>('[data-toc]');
  if (tocContainers.length === 0) return;

  const tocLinks = document.querySelectorAll<HTMLAnchorElement>('[data-toc] .toc-link');
  const headings = [...tocLinks]
    .map((link) => decodeURIComponent(link.hash.slice(1)))
    .filter((slug, index, slugs) => slugs.indexOf(slug) === index)
    .map((slug) => document.getElementById(slug))
    .filter((element): element is HTMLElement => element !== null);
  if (headings.length === 0) return;

  let activeSlug: string | null = null;
  let frameRequested = false;

  function currentHeadingSlug(): string {
    let current = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= CURRENT_SECTION_OFFSET_PX) current = heading;
      else break;
    }
    return current.id;
  }

  function updateActiveLink(): void {
    frameRequested = false;
    const slug = currentHeadingSlug();
    if (slug === activeSlug) return;
    activeSlug = slug;
    tocLinks.forEach((link) => {
      link.classList.toggle('is-active', decodeURIComponent(link.hash.slice(1)) === slug);
    });
  }

  function requestUpdate(): void {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(updateActiveLink);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  requestUpdate();
}
