import { describe, expect, it, vi } from 'vitest';
import { initHeadingAnchorLinks } from '../../../src/scripts/blog/heading-anchor-links';
import { initTocScrollSpy } from '../../../src/scripts/blog/toc-scroll-spy';
import { recordPageView } from '../../../src/scripts/page-views/record-page-view';

function placeHeadingAt(id: string, top: number) {
  const heading = document.getElementById(id);
  if (!heading) throw new Error(`Missing heading ${id}`);
  vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 100, 20));
}

function activeLinks(): string[] {
  return [...document.querySelectorAll<HTMLAnchorElement>('.toc-link.is-active')].map((link) => link.hash);
}

describe('initHeadingAnchorLinks', () => {
  it('adds a labelled anchor to every linkable post heading', () => {
    document.body.innerHTML = `
      <article class="post-article">
        <h2 id="intro">Intro</h2>
        <h3 id="details">Details</h3>
        <h2>No id</h2>
      </article>
      <h2 id="outside">Outside</h2>`;
    initHeadingAnchorLinks();
    const anchors = [...document.querySelectorAll<HTMLAnchorElement>('.heading-anchor')];

    expect(anchors.map((anchor) => [anchor.getAttribute('href'), anchor.getAttribute('aria-label')])).toStrictEqual([
      ['#intro', 'Link to “Intro”'],
      ['#details', 'Link to “Details”'],
    ]);
  });
});

describe('initTocScrollSpy', () => {
  function renderPostWithToc() {
    document.body.innerHTML = `
      <nav data-toc>
        <a class="toc-link" href="#first">First</a>
        <a class="toc-link" href="#second">Second</a>
        <a class="toc-link" href="#%E8%B4%A8%E5%AD%90">质子</a>
      </nav>
      <nav data-toc><a class="toc-link" href="#second">Second</a></nav>
      <h2 id="first">First</h2>
      <h2 id="second">Second</h2>
      <h2 id="质子">质子</h2>`;
  }

  function runAnimationFramesImmediately() {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
  }

  it('highlights the first section before any heading scrolls past the offset', () => {
    renderPostWithToc();
    runAnimationFramesImmediately();
    placeHeadingAt('first', 400);
    placeHeadingAt('second', 900);
    placeHeadingAt('质子', 1400);
    initTocScrollSpy();

    expect(activeLinks()).toStrictEqual(['#first']);
  });

  it('follows the last heading above the offset in every table of contents on scroll', () => {
    renderPostWithToc();
    runAnimationFramesImmediately();
    placeHeadingAt('first', 400);
    placeHeadingAt('second', 900);
    placeHeadingAt('质子', 1400);
    initTocScrollSpy();
    placeHeadingAt('first', -600);
    placeHeadingAt('second', 50);
    placeHeadingAt('质子', 500);
    window.dispatchEvent(new Event('scroll'));

    expect(activeLinks()).toStrictEqual(['#second', '#second']);
  });

  it('decodes non-ASCII heading slugs', () => {
    renderPostWithToc();
    runAnimationFramesImmediately();
    placeHeadingAt('first', -900);
    placeHeadingAt('second', -500);
    placeHeadingAt('质子', 10);
    initTocScrollSpy();

    expect(activeLinks()).toStrictEqual(['#%E8%B4%A8%E5%AD%90']);
  });

  it('coalesces bursts of scroll events into one animation frame', () => {
    renderPostWithToc();
    const scheduledFrames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => scheduledFrames.push(callback));
    initTocScrollSpy();
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));

    expect(scheduledFrames).toHaveLength(1);
  });

  it('does nothing on pages without a table of contents or without matching headings', () => {
    const requestFrame = vi.fn<typeof requestAnimationFrame>();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    initTocScrollSpy();
    document.body.innerHTML = '<nav data-toc><a class="toc-link" href="#missing">Missing</a></nav>';
    initTocScrollSpy();

    expect(requestFrame).not.toHaveBeenCalled();
  });
});

describe('recordPageView', () => {
  function renderViewCounters() {
    document.body.innerHTML = `
      <span data-page-view-count hidden><span data-page-view-count-value></span></span>
      <span data-page-view-count hidden><span data-page-view-count-value></span></span>`;
  }

  function counters() {
    return [...document.querySelectorAll<HTMLElement>('[data-page-view-count]')].map((counter) => [
      counter.hidden,
      counter.textContent,
    ]);
  }

  it('posts the current path and shows the formatted total', async () => {
    renderViewCounters();
    const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ totalViews: 12345 }));
    vi.stubGlobal('fetch', fetchStub);
    await recordPageView();

    expect(fetchStub).toHaveBeenCalledWith('/api/page-views', {
      method: 'POST',
      body: '/blog/physics/test-post/',
      keepalive: true,
    });
    expect(counters()).toStrictEqual([
      [false, '12,345 views'],
      [false, '12,345 views'],
    ]);
  });

  it('uses the singular for a first view', async () => {
    renderViewCounters();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ totalViews: 1 })));
    await recordPageView();

    expect(counters()[0]).toStrictEqual([false, '1 view']);
  });

  it.each([
    {
      name: 'a rejected request',
      fetchStub: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 400 })),
    },
    { name: 'a network failure', fetchStub: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')) },
  ])('keeps the counter hidden after $name', async ({ fetchStub }) => {
    renderViewCounters();
    vi.stubGlobal('fetch', fetchStub);
    await recordPageView();

    expect(counters()[0]).toStrictEqual([true, '']);
  });
});
