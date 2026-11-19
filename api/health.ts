import type { IncomingMessage, ServerResponse } from 'node:http';

/** Liveness only: no credentials, configuration or dependency details are returned. */
export default function health(request: IncomingMessage, response: ServerResponse): void {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.writeHead(405);
    response.end(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }

  response.writeHead(200);
  response.end(JSON.stringify({ status: 'ok' }));
}
