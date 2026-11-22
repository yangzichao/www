import type { APIContext, APIRoute } from 'astro';
import { FakeCookieJar } from '../../support/fake-cookies';

export const TEST_SITE_ORIGIN = 'https://site.test';

export interface ApiRequestOptions {
  method?: string;
  path: string;
  body?: string | object;
  sameOrigin?: boolean;
  cookies?: Record<string, string>;
  params?: Record<string, string>;
}

export interface ApiCallResult {
  response: Response;
  cookies: FakeCookieJar;
  backgroundTasks: Promise<unknown>[];
}

function buildRequest(options: ApiRequestOptions, url: URL): Request {
  const headers = new Headers();
  if (options.sameOrigin ?? true) headers.set('origin', TEST_SITE_ORIGIN);
  const init: RequestInit = { method: options.method ?? 'GET', headers };
  if (options.body !== undefined) {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    if (typeof options.body !== 'string') headers.set('content-type', 'application/json');
  }
  return new Request(url, init);
}

function redirectResponse(location: string | URL, status = 302): Response {
  return new Response(null, { status, headers: { location: location.toString() } });
}

export async function callRoute(route: APIRoute | undefined, options: ApiRequestOptions): Promise<ApiCallResult> {
  if (!route) throw new Error(`Route handler for ${options.method ?? 'GET'} ${options.path} is not exported`);
  const url = new URL(options.path, TEST_SITE_ORIGIN);
  const cookies = new FakeCookieJar(options.cookies);
  const backgroundTasks: Promise<unknown>[] = [];
  const context = {
    url,
    request: buildRequest(options, url),
    params: options.params ?? {},
    cookies: cookies.asAstroCookies(),
    clientAddress: '203.0.113.7',
    redirect: redirectResponse,
    locals: {
      cfContext: {
        waitUntil: (task: Promise<unknown>) => {
          backgroundTasks.push(task);
        },
      },
    },
  };
  const response = await route(context as unknown as APIContext);
  await Promise.all(backgroundTasks);
  return { response, cookies, backgroundTasks };
}
