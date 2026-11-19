import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
type Renderer = { renderPage: (path: string) => Promise<Response | null> };
let renderer: Promise<Renderer> | undefined;
export function createRenderHandler(
  load: () => Promise<Renderer> = () =>
    (renderer ??= import(pathToFileURL(resolve('dist/wow-forever-addons/server/server.mjs')).href)),
) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const fail = (status: number) => {
      response.setHeader('X-Robots-Tag', 'noindex, nofollow');
      response
        .writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(
          request.method === 'HEAD'
            ? ''
            : '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ficha no disponible | WoW Forever Addons</title><main><h1>No podemos mostrar esta ficha.</h1><p>Consulta el catálogo o inténtalo de nuevo más tarde.</p><a href="/catalogo">Volver al catálogo</a></main></html>',
        );
    };
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, HEAD');
      fail(405);
      return;
    }
    const url = new URL(request.url ?? '/', 'http://localhost');
    const slug = url.pathname.startsWith('/addons/')
      ? url.pathname.slice(8)
      : (url.searchParams.get('slug') ?? '');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
      fail(404);
      return;
    }
    try {
      const rendered = await (await load()).renderPage(`/addons/${slug}`);
      if (!rendered) {
        fail(404);
        return;
      }
      rendered.headers.forEach((value, key) => response.setHeader(key, value));
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      if (rendered.status !== 200) {
        response.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
      response
        .writeHead(rendered.status)
        .end(request.method === 'HEAD' ? undefined : Buffer.from(await rendered.arrayBuffer()));
    } catch {
      fail(503);
    }
  };
}
export default createRenderHandler();
