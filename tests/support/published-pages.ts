export const PUBLISHED_TEST_PAGE = '/blog/physics/test-post/';
const SECOND_PUBLISHED_TEST_PAGE = '/blog/meta/second-test-post/';

const PUBLISHED_TEST_PAGES = new Set([PUBLISHED_TEST_PAGE, SECOND_PUBLISHED_TEST_PAGE]);

export function respondLikeStaticAssets(request: Request): Response {
  const { pathname } = new URL(request.url);
  return new Response(null, { status: PUBLISHED_TEST_PAGES.has(pathname) ? 200 : 404 });
}
