import type { IncomingMessage, ServerResponse } from 'node:http';
import { readSupabasePublicConfig } from '../server/config/supabase.ts';
import { readPublicCatalog } from '../server/catalog.ts';
export function createAddonHandler(fetcher: typeof fetch = fetch) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      response.writeHead(405).end(JSON.stringify({ error: 'method_not_allowed' }));
      return;
    }
    const slug = new URL(request.url ?? '/', 'http://localhost').searchParams.get('slug') ?? '';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
      response.writeHead(404).end(JSON.stringify({ addon: null }));
      return;
    }
    try {
      const config = readSupabasePublicConfig(process.env);
      if (!config) {
        throw new Error();
      }
      const rows = await readPublicCatalog(config, fetcher, slug);
      response.writeHead(rows.length ? 200 : 404).end(JSON.stringify({ addon: rows[0] ?? null }));
    } catch {
      response.writeHead(503).end(JSON.stringify({ error: 'addon_unavailable' }));
    }
  };
}
export default createAddonHandler();
