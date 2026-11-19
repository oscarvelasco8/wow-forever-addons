import { createServer } from 'node:http';
import health from '../api/health.ts';
import publicConfig from '../api/public-config.ts';
import catalog from '../api/catalog.ts';
import download from '../api/download.ts';
import image from '../api/image.ts';
import render from '../api/render.ts';
import sitemap from '../api/sitemap.ts';
import addon from '../api/addon.ts';
import supportCheckout from '../api/support-checkout.ts';
import supportWebhook from '../api/support-webhook.ts';
import supportStatus from '../api/support-status.ts';

// Local adapter only. Vercel serves api/*.ts directly in production.
const port = Number(process.env['API_PORT'] ?? '3001');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('API_PORT must be an integer between 1 and 65535.');
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  if(pathname==='/api/support-status'){void supportStatus(request,response);return;}
  if (pathname === '/api/support-webhook') { void supportWebhook(request, response); return; }
  if (pathname === '/api/support-checkout') { void supportCheckout(request, response); return; }
  if(pathname==='/api/addon'){void addon(request,response);return;}
  if (pathname === '/api/catalog') {
    void catalog(request, response);
    return;
  }
  if (pathname === '/api/download') {
    void download(request, response);
    return;
  }
  if (pathname === '/api/image') {
    void image(request, response);
    return;
  }
  if (pathname === '/api/render' || pathname.startsWith('/addons/')) {
    void render(request, response);
    return;
  }
  if (pathname === '/api/sitemap' || pathname === '/sitemap.xml') {
    void sitemap(request, response);
    return;
  }
  if (pathname === '/api/public-config') {
    publicConfig(request, response);
    return;
  }
  if (pathname === '/api/health') {
    health(request, response);
    return;
  }

  response.writeHead(404, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`API local: http://127.0.0.1:${port}/api/health`);
});
