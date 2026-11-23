export const PUBLISHED_TEST_PAGE = '/blog/physics/11be-proton-emission/';
export const PRIVATE_TEST_POST_PAGE = '/blog/system-design/kv-store/';
export const STATIC_TEST_PAGE = '/static-test-page/';

export function respondLikeStaticAssets(request: Request): Response {
  const { pathname } = new URL(request.url);
  return new Response(null, { status: pathname === STATIC_TEST_PAGE ? 200 : 404 });
}
