import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createRenderHandler } from '../../api/render.ts';
import { readSiteOrigin } from '../../server/config/site.ts';
test('SSR adapter accepts only addon paths and never passes caller headers to the renderer', async (context) => {
  let mode = 'ok',
    calls = 0;
  const handler = createRenderHandler(async () => ({
    renderPage: async (path) => {
      calls++;
      assert.equal(path, '/addons/prueba');
      if (mode === 'error') {
        throw new Error('private diagnostic');
      }
      return new Response('<html lang="es"><h1>Prueba</h1></html>', {
        status: mode === 'missing' ? 404 : 200,
      });
    },
  }));
  const server = createServer((req, res) => {
    void handler(req, res);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const ok = await fetch(`${base}/api/render?slug=prueba`, {
    headers: {
      Authorization: 'Bearer never-forward',
      Cookie: 'never-forward',
      'X-Forwarded-Host': 'evil.example',
    },
  });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('content-type') ?? '', /text\/html/);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(`${base}/addons/prueba`, { method: 'HEAD' })).status, 200);
  const before = calls;
  for (const path of [
    '/api/render?slug=../admin',
    '/api/render?slug=https://evil.example',
    '/api/render',
  ]) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  assert.equal(calls, before);
  assert.equal((await fetch(`${base}/addons/prueba`, { method: 'POST' })).status, 405);
  mode = 'missing';
  const missing = await fetch(`${base}/addons/prueba`);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('x-robots-tag'), 'noindex, nofollow');
  mode = 'error';
  const failed = await fetch(`${base}/addons/prueba`);
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes('private diagnostic'));
});
test('canonical origin is explicit and rejects credentials, paths and unsafe schemes', () => {
  assert.equal(readSiteOrigin(undefined), null);
  assert.equal(readSiteOrigin('https://addons.example.test/'), 'https://addons.example.test');
  for (const invalid of [
    'https://user:password@example.test',
    'https://example.test/path',
    'javascript:alert(1)',
    'http://public.example.test',
    'https://example.test?token=x',
  ]) {
    assert.throws(() => readSiteOrigin(invalid));
  }
});
