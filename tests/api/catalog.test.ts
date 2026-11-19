import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createCatalogHandler } from '../../api/catalog.ts';
import { createDownloadHandler } from '../../api/download.ts';

test('catalog and downloads always use anonymous RLS and fail closed', async context => {
  const id = '11111111-1111-4111-8111-111111111111';
  const addonId = '22222222-2222-4222-8222-222222222222';
  const release = { id, addon_id: addonId, version: '1.0', game_version: 'Forever', interface_version: 16001,
    changelog: 'Novedades', status: 'published', published_at: '2000-01-01T00:00:00Z', file_path: `${addonId}/${id}.zip` };
  const row = { slug: 'ejemplo', name: 'Ejemplo', summary: 'Resumen', description: 'Descripción', installation_instructions: 'Instalación', author_name: 'Autor',
    license_name: 'MIT', credits: 'Créditos', distribution_approved: true, status: 'published', published_at: '2000-01-01T00:00:00Z',
    categories: { name: 'Utilidades', slug:'utilidades',sort_order:2,is_visible: true }, addon_releases: [release], addon_images: [{id,alt_text:'Vista de prueba',sort_order:0,is_published:true,file_path:'never-export'}], private_extra: 'never-export' };
  let mode = 'ok';
  let signingRequests = 0;
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('apikey'), 'sb_publishable_publictestkey1234');
    assert.equal(headers.get('authorization'), null);
    assert.equal(headers.get('cookie'), null);
    assert.equal(init?.cache, 'no-store');
    if (mode === 'offline') { throw new Error('private upstream diagnostics'); }
    if(url.includes('/rest/v1/categories?')){return Response.json([{slug:'utilidades',name:'Utilidades',sort_order:2}]);}
    if (url.includes('/rest/v1/rpc/catalog_page?')) {
      assert.equal(init?.method,'POST');
      assert.equal(JSON.parse(String(init?.body)).p_limit,13);
      return Response.json([{slug:row.slug,name:row.name}]);
    }
    if(url.includes('/rest/v1/addons?')){
      assert.equal(new URL(url).searchParams.get('addon_images.is_published'),'eq.true');
      assert.equal(new URL(url).searchParams.get('addon_images.order'),'sort_order.asc,id.asc');
      if(mode==='hidden-image'){return Response.json([{...row,addon_images:[{...row.addon_images[0],is_published:false}]}]);}
      return Response.json(mode === 'draft' ? [{ ...row, status: 'draft' }] : [row]);
    }
    if (url.includes('/rest/v1/addon_releases?')) {
      return Response.json(mode === 'missing' ? [] : mode === 'draft' ? [{ ...release, status: 'draft' }] : [release]);
    }
    assert.ok(url.endsWith(`/storage/v1/object/sign/addon-files/${release.file_path}`));
    signingRequests++;
    assert.deepEqual(JSON.parse(String(init?.body)), { expiresIn: 60 });
    return Response.json({ signedURL: mode === 'malicious' ? 'https://evil.example/steal'
      : `/object/sign/addon-files/${release.file_path}?token=test-only` });
  };
  const catalog = createCatalogHandler(transport), download = createDownloadHandler(transport);
  const server = createServer((req, res) => { void (req.url?.startsWith('/api/download') ? download(req, res) : catalog(req, res)); });
  const previous = { url: process.env['SUPABASE_URL'], key: process.env['SUPABASE_PUBLISHABLE_KEY'] };
  process.env['SUPABASE_URL'] = 'https://example.supabase.co';
  process.env['SUPABASE_PUBLISHABLE_KEY'] = 'sb_publishable_publictestkey1234';
  context.after(async () => {
    server.closeAllConnections();
    for (const [key, value] of Object.entries({ SUPABASE_URL: previous.url, SUPABASE_PUBLISHABLE_KEY: previous.key })) {
      if (value === undefined) { delete process.env[key]; } else { process.env[key] = value; }
    }
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const anonymous = await fetch(`${base}/api/catalog`, { headers: { Authorization: 'Bearer never-forward', Cookie: 'never-forward' } });
  assert.equal(anonymous.status, 200);
  const payload = await anonymous.json() as { addons: Record<string, unknown>[] };
  assert.equal(payload.addons[0]?.['name'], 'Ejemplo');
  assert.equal(payload.addons[0]?.['description'],'');
  assert.deepEqual(payload.addons[0]?.['images'],[{id,altText:'Vista de prueba'}]);
  assert.ok(!JSON.stringify(payload).includes('never-export'));
  assert.ok(!JSON.stringify(payload).includes('file_path'));
  assert.equal(anonymous.headers.get('cache-control'), 'no-store');
  for (const failure of ['draft', 'offline','hidden-image']) {
    mode = failure;
    const response = await fetch(`${base}/api/catalog`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'catalog_unavailable' });
  }
  mode = 'ok';
  const redirect = await fetch(`${base}/api/download?release=${id}`, { redirect: 'manual', headers: { Authorization: 'Bearer never-forward' } });
  assert.equal(redirect.status, 303);
  const destination = new URL(redirect.headers.get('location')!);
  assert.equal(destination.origin, 'https://example.supabase.co');
  assert.equal(destination.searchParams.get('download'), `addon-${id}.zip`);
  assert.equal(redirect.headers.get('cache-control'), 'no-store');
  assert.equal(signingRequests, 1);
  for (const failure of ['draft', 'missing']) {
    mode = failure;
    assert.equal((await fetch(`${base}/api/download?release=${id}`)).status, 404);
    assert.equal(signingRequests, 1);
  }
  mode = 'malicious';
  assert.equal((await fetch(`${base}/api/download?release=${id}`, { redirect: 'manual' })).status, 503);
  assert.equal((await fetch(`${base}/api/download?release=../../escape`)).status, 404);
  assert.equal((await fetch(`${base}/api/catalog`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/api/download`, { method: 'POST' })).status, 405);
});
