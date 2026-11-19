import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import health from '../api/health.ts';
import config from '../api/public-config.ts';
import catalog from '../api/catalog.ts';
import download from '../api/download.ts';
import image from '../api/image.ts';
import render from '../api/render.ts';
import sitemap from '../api/sitemap.ts';
import addon from '../api/addon.ts';
import supportCheckout from '../api/support-checkout.ts';
import supportWebhook from '../api/support-webhook.ts';
import supportStatus from '../api/support-status.ts';
const root = resolve('dist/wow-forever-addons/browser'),
  port = Number(process.env.BUILT_PORT ?? 4202);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid built preview port.');
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};
createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const handlers = {
    '/api/support-status':supportStatus,
    '/api/support-webhook': supportWebhook,
    '/api/support-checkout': supportCheckout,
    '/api/health': health,
    '/api/public-config': config,
    '/api/catalog': catalog,
    '/api/addon': addon,
    '/api/download': download,
    '/api/image': image,
    '/api/render': render,
    '/api/sitemap': sitemap,
    '/sitemap.xml': sitemap,
  };
  if (handlers[pathname]) {
    await handlers[pathname](req, res);
    return;
  }
  if (pathname.startsWith('/addons/')) {
    await render(req, res);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    res.writeHead(405).end();
    return;
  }
  let file = resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (pathname === '/administracion' || pathname.startsWith('/administracion/')) {
    file = resolve(root, 'index.csr.html');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  } else if (!extname(file)) {
    file = resolve(file, 'index.html');
  }
  let status = 200,
    content;
  try {
    content = await readFile(file);
  } catch {
    status = 404;
    file = resolve(root, '404.html');
    try {
      content = await readFile(file);
    } catch {
      res.writeHead(503).end('Build required');
      return;
    }
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
  res.writeHead(status).end(req.method === 'HEAD' ? undefined : content);
}).listen(port, '127.0.0.1', () => console.log(`Build local: http://127.0.0.1:${port}`));
