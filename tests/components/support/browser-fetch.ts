import { vi } from 'vitest';

export interface ObservedRequest {
  method: string;
  pathWithQuery: string;
  body: unknown;
}

type RouteHandler = (request: ObservedRequest) => Response | Promise<Response>;

const PAGE_ORIGIN = 'http://localhost';

function readJsonBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') return null;
  return JSON.parse(body) as unknown;
}

function requestUrlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function stubBrowserFetch(routes: Record<string, RouteHandler>): ObservedRequest[] {
  const observed: ObservedRequest[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(requestUrlOf(input), PAGE_ORIGIN);
      const request: ObservedRequest = {
        method: init?.method ?? 'GET',
        pathWithQuery: `${url.pathname}${url.search}`,
        body: readJsonBody(init?.body),
      };
      observed.push(request);
      const handler =
        routes[`${request.method} ${request.pathWithQuery}`] ?? routes[`${request.method} ${url.pathname}`];
      if (!handler)
        return Response.json({ error: `Unexpected ${request.method} ${request.pathWithQuery}` }, { status: 599 });
      return handler(request);
    }),
  );
  return observed;
}
