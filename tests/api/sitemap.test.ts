import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createSitemapHandler } from '../../api/sitemap.ts';
test('sitemap requires the configured domain, uses anonymous publications and fails closed', async (context) => {
  const previous = { ...process.env };
  let fail = false;
  process.env['PUBLIC_SITE_URL'] = 'https://addons.example.test';
  process.env['SUPABASE_URL'] = 'https://example.supabase.co';
  process.env['SUPABASE_PUBLISHABLE_KEY'] = 'sb_publishable_testSitemap1234';
  const handler = createSitemapHandler(async (_input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), null);
    assert.equal(headers.get('cookie'), null);
    return fail
      ? Response.json({ error: 'private' }, { status: 503 })
      : Response.json([
          {
            slug: 'publicado',
            name: 'Publicado',
            summary: 'Resumen',
            description: '',
            installation_instructions: '',
            author_name: 'Autor',
            license_name: 'MIT',
            credits: '',
            status: 'published',
            distribution_approved: true,
            published_at: '2000-01-01',
            categories: { name: 'Ejemplo', slug: 'ejemplo', sort_order: 0, is_visible: true },
            addon_releases: [],
            addon_images: [],
          },
        ]);
  });
  const server = createServer((req, res) => {
    void handler(req, res);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/sitemap.xml`;
  context.after(async () => {
    for (const key of ['PUBLIC_SITE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const response = await fetch(base, {
    headers: { Host: 'untrusted.example', Authorization: 'Bearer never-forward' },
  });
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.ok(body.includes('https://addons.example.test/addons/publicado'));
  assert.ok(!body.includes('administracion'));
  assert.ok(!body.includes('untrusted.example'));
  fail = true;
  assert.equal((await fetch(base)).status, 503);
  delete process.env['PUBLIC_SITE_URL'];
  assert.equal((await fetch(base)).status, 503);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
