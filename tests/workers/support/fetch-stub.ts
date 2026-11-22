import { vi } from 'vitest';

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string;
  formFields: Record<string, string>;
}

type RequestResponder = (request: RecordedRequest) => Response | Promise<Response>;

async function readFormFields(request: Request): Promise<Record<string, string>> {
  const fields: Record<string, string> = {};
  for (const [name, value] of await request.formData()) {
    if (typeof value === 'string') fields[name] = value;
  }
  return fields;
}

async function recordRequest(request: Request): Promise<RecordedRequest> {
  const isForm = request.headers.get('content-type')?.startsWith('multipart/form-data') ?? false;
  return {
    url: request.url,
    method: request.method,
    headers: request.headers,
    body: isForm ? '' : await request.text(),
    formFields: isForm ? await readFormFields(request) : {},
  };
}

export function stubOutboundFetch(responder: RequestResponder): RecordedRequest[] {
  const recorded: RecordedRequest[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const recordedRequest = await recordRequest(new Request(input, init));
    recorded.push(recordedRequest);
    return responder(recordedRequest);
  });
  return recorded;
}
