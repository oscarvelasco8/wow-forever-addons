import type { IncomingMessage, ServerResponse } from 'node:http';
import { readSupabasePublicConfig } from '../server/config/supabase.ts';

export default function publicConfig(request: IncomingMessage, response: ServerResponse): void {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.writeHead(405).end(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }
  try {
    const config = readSupabasePublicConfig(process.env);
    response.writeHead(config ? 200 : 503).end(JSON.stringify(config ?? { error: 'unconfigured' }));
  } catch {
    response.writeHead(503).end(JSON.stringify({ error: 'unconfigured' }));
  }
}
