import type { IncomingMessage, ServerResponse } from 'node:http';
import { readSupabasePublicConfig } from '../server/config/supabase.ts';
import { publicAssetPath } from '../server/asset-path.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createDownloadHandler(fetcher: typeof fetch = fetch) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const unavailable = (status: number) => {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.writeHead(status).end('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Descarga no disponible | WoW Forever Addons</title><body><main><h1>La descarga no está disponible.</h1><p>Esta versión puede haberse retirado. Consulta el catálogo o inténtalo más tarde.</p><a href="/catalogo">Volver al catálogo</a></main></body></html>');
    };
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); unavailable(405); return; }
    const id = new URL(request.url ?? '/', 'http://localhost').searchParams.get('release') ?? '';
    if (!uuid.test(id)) { unavailable(404); return; }
    try {
      const config = readSupabasePublicConfig(process.env);
      if (!config) { throw new Error('Unavailable configuration.'); }
      const options = { headers: { apikey: config.publishableKey }, cache: 'no-store' as const,
        signal: AbortSignal.timeout(10000) };
      const query = new URLSearchParams({ select: 'id,addon_id,status,published_at,file_path', id: `eq.${id}`, limit: '1' });
      const metadata = await fetcher(`${config.url}/rest/v1/addon_releases?${query}`, options);
      if (!metadata.ok) { throw new Error('Unavailable metadata.'); }
      const rows = await metadata.json();
      const release = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
      if (!release || release.status !== 'published' || !release.published_at ||
        !Number.isFinite(Date.parse(release.published_at)) || Date.parse(release.published_at) > Date.now() ||
        !uuid.test(release.addon_id) || release.id !== id || !publicAssetPath(release.addon_id,id,release.file_path,'release')) {
        unavailable(404); return;
      }
      // Signing is anonymous too: RLS rechecks publication. No service key or user JWT.
      const signed = await fetcher(`${config.url}/storage/v1/object/sign/addon-files/${release.file_path}`, {
        ...options, method: 'POST', headers: { ...options.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 60 }), signal: AbortSignal.timeout(10000),
      });
      if (!signed.ok) { unavailable(signed.status >= 500 ? 503 : 404); return; }
      const result = await signed.json() as { signedURL?: unknown };
      if (typeof result.signedURL !== 'string' || !result.signedURL.startsWith(`/object/sign/addon-files/${release.file_path}?`)) {
        throw new Error('Unexpected signing response.');
      }
      const destination = new URL(`${config.url}/storage/v1${result.signedURL}`);
      destination.searchParams.set('download', `addon-${id}.zip`);
      response.writeHead(303, { Location: destination.href }).end();
    } catch { unavailable(503); }
  };
}
export default createDownloadHandler();
