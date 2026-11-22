const PAGE_VIEWS_ENDPOINT = '/api/page-views';

interface PageViewResponse {
  totalViews: number;
}

function formatViewCount(totalViews: number): string {
  const count = totalViews.toLocaleString('en-US');
  return totalViews === 1 ? `${count} view` : `${count} views`;
}

function showViewCount(totalViews: number) {
  document.querySelectorAll<HTMLElement>('[data-page-view-count]').forEach((container) => {
    const value = container.querySelector('[data-page-view-count-value]');
    if (value) value.textContent = formatViewCount(totalViews);
    container.hidden = false;
  });
}

export async function recordPageView(): Promise<void> {
  const response = await fetch(PAGE_VIEWS_ENDPOINT, {
    method: 'POST',
    body: location.pathname,
    keepalive: true,
  }).catch(() => null);
  if (!response?.ok) return;
  const { totalViews } = await response.json<PageViewResponse>();
  showViewCount(totalViews);
}
