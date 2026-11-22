const PRIVATE_PAGE_HEADERS: Readonly<Record<string, string>> = {
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
};

export function markAsPrivatePage(headers: Headers): void {
  for (const [name, value] of Object.entries(PRIVATE_PAGE_HEADERS)) headers.set(name, value);
}

export function privateNotFoundResponse(): Response {
  const response = new Response('Not found', { status: 404 });
  markAsPrivatePage(response.headers);
  return response;
}
