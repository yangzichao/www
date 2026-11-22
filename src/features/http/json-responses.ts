export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } });
}

export function jsonNoStore(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
