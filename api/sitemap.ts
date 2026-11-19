import type { IncomingMessage, ServerResponse } from 'node:http';
import { readSiteOrigin } from '../server/config/site.ts';
import { readSupabasePublicConfig } from '../server/config/supabase.ts';
import { readPublishedSlugs } from '../server/catalog-page.ts';
const xml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
export function createSitemapHandler(fetcher: typeof fetch = fetch) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, HEAD');
      response.writeHead(405).end();
      return;
    }
    try {
      const origin = readSiteOrigin(process.env['PUBLIC_SITE_URL']),
        config = readSupabasePublicConfig(process.env);
      if (!origin || !config) {
        throw new Error('Unavailable configuration.');
      }
      const slugs = await readPublishedSlugs(config, fetcher);
      const paths = [
        '/',
        '/catalogo',
        '/apoyar',
        ...slugs.map((slug) => `/addons/${slug}`),
      ];
      const document =
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        paths.map((path) => `<url><loc>${xml(new URL(path, origin).href)}</loc></url>`).join('') +
        '</urlset>';
      response
        .writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' })
        .end(request.method === 'HEAD' ? undefined : document);
    } catch {
      response.setHeader('X-Robots-Tag', 'noindex, nofollow');
      response
        .writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end(request.method === 'HEAD' ? undefined : 'El mapa del sitio no está disponible.');
    }
  };
}
export default createSitemapHandler();
