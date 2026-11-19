import type { IncomingMessage, ServerResponse } from 'node:http';
import { readSupabasePublicConfig } from '../server/config/supabase.ts';
import { readCatalogPage, catalogCriteria, InvalidCatalogQuery } from '../server/catalog-page.ts';

export function createCatalogHandler(fetcher: typeof fetch = fetch) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
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
      if (!config) {
        throw new Error('Configuration unavailable.');
      }
      const page = await readCatalogPage(
        config,
        catalogCriteria(new URL(request.url ?? '/', 'http://localhost')),
        fetcher,
      );
      response.writeHead(200).end(JSON.stringify(page));
    } catch (error) {
      response
        .writeHead(error instanceof InvalidCatalogQuery ? 400 : 503)
        .end(
          JSON.stringify({
            error:
              error instanceof InvalidCatalogQuery
                ? 'invalid_catalog_query'
                : 'catalog_unavailable',
          }),
        );
    }
  };
}
export default createCatalogHandler();
