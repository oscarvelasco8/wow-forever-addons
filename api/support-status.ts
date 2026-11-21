import type { IncomingMessage, ServerResponse } from 'node:http';
// Retired endpoints never read credentials, process payloads or contact payment providers.
export default function retiredSupport(_request: IncomingMessage, response: ServerResponse): void {
 response.writeHead(410, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
 response.end(JSON.stringify({ error: 'support_integration_retired' }));
}
