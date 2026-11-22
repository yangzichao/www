export function isSameOriginRequest(request: Request, url: URL): boolean {
  return request.headers.get('origin') === url.origin;
}
