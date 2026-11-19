import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { JSDOM } from 'jsdom';
import { createRenderHandler } from '../../api/render.ts';
import { renderPage } from '../../dist/wow-forever-addons/server/server.mjs';

test('built Angular SSR returns published HTML, safe metadata, 404 for withdrawn content and 503 for upstream failures', async (context) => {
  let mode = 'published';
  const original = { ...process.env };
  const row = {
    slug: 'prueba',
    name: 'Prueba <em>segura</em>',
    summary: 'Resumen "seguro" de prueba',
    description: '</script><script>window.privateLeak=true</script>',
    installation_instructions: 'Instrucciones en el HTML inicial',
    author_name: 'Autor',
    license_name: 'MIT',
    credits: 'Créditos',
    status: 'published',
    distribution_approved: true,
    published_at: '2000-01-01T00:00:00Z',
    categories: { name: 'Herramientas', slug: 'herramientas', sort_order: 0, is_visible: true },
    addon_releases: [],
    addon_images: [],
  };
  const upstream = createServer((req, res) => {
    assert.equal(req.headers.authorization, undefined);
    assert.equal(req.headers.cookie, undefined);
    assert.equal(req.headers.apikey, 'sb_publishable_testSSRonly1234');
    res.setHeader('Content-Type', 'application/json');
    res
      .writeHead(mode === 'error' ? 503 : 200)
      .end(
        JSON.stringify(
          mode === 'error' ? { error: 'private provider detail' } : mode === 'missing' ? [] : [row],
        ),
      );
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const address = upstream.address();
  assert.ok(address && typeof address !== 'string');
  process.env.SUPABASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_testSSRonly1234';
  process.env.PUBLIC_SITE_URL = 'https://addons.example.test';
  const handler = createRenderHandler(async () => ({ renderPage })),
    server = createServer((req, res) => {
      void handler(req, res);
    });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const appAddress = server.address();
  assert.ok(appAddress && typeof appAddress !== 'string');
  context.after(async () => {
    for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'PUBLIC_SITE_URL']) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
    for (const instance of [server, upstream]) {
      instance.closeAllConnections();
      await new Promise((resolve) => instance.close(resolve));
    }
  });
  const base = `http://127.0.0.1:${appAddress.port}/addons/prueba`;
  let response = await fetch(base, {
      headers: {
        Authorization: 'Bearer never-forward',
        Cookie: 'never-forward',
        'X-Forwarded-Host': 'evil.example',
      },
    }),
    html = await response.text();
  assert.equal(response.status, 200);
  let document = new JSDOM(html).window.document;
  assert.ok(document.querySelector('h1').textContent.includes(row.name));
  assert.ok(document.body.textContent.includes(row.installation_instructions));
  assert.equal(document.querySelector('meta[name=description]').content, row.summary);
  assert.equal(
    document.querySelector('link[rel=canonical]').href,
    'https://addons.example.test/addons/prueba',
  );
  assert.equal(document.querySelector('meta[name=robots]').content, 'index, follow');
  assert.ok(!html.includes('<script>window.privateLeak=true</script>'));
  assert.ok(!html.includes('never-forward'));
  assert.ok(!html.includes('Cargando ficha'));
  mode = 'missing';
  response = await fetch(base);
  html = await response.text();
  assert.equal(response.status, 404);
  document = new JSDOM(html).window.document;
  assert.ok(document.body.textContent.includes('Este addon no está disponible'));
  assert.equal(document.querySelector('link[rel=canonical]'), null);
  assert.equal(document.querySelector('meta[name=robots]').content, 'noindex, nofollow');
  assert.ok(!html.includes(row.name));
  mode = 'error';
  response = await fetch(base);
  html = await response.text();
  assert.equal(response.status, 503);
  assert.ok(html.includes('No podemos cargar la ficha'));
  assert.ok(!html.includes('private provider detail'));
});
