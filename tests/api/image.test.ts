import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createImageHandler } from '../../api/image.ts';
import sharp from 'sharp';

test('public image endpoint rechecks publication anonymously and rejects hidden assets and unsafe paths', async (context) => {
  const id = '11111111-1111-4111-8111-111111111111',
    addonId = '22222222-2222-4222-8222-222222222222';
  const path = `${addonId}/${id}.png`;
  const parent = {
    status: 'published',
    distribution_approved: true,
    published_at: '2000-01-01T00:00:00Z',
    categories: { is_visible: true },
  };
  const row = { id, addon_id: addonId, file_path: path, is_published: true, addons: parent };
  const png=await sharp({create:{width:2,height:2,channels:3,background:'#234567'}}).png().toBuffer();
  let mode = 'ok',
    signs = 0;
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input)),
      headers = new Headers(init?.headers);
    if(url.searchParams.has('token')){assert.equal(url.origin,'https://example.supabase.co');assert.equal(headers.get('authorization'),null);return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png'}});}
    assert.equal(headers.get('apikey'), 'sb_publishable_publictestkey1234');
    assert.equal(headers.get('authorization'), null);
    assert.equal(headers.get('cookie'), null);
    assert.equal(init?.cache, 'no-store');
    if (mode === 'offline') {
      throw new Error('private provider error');
    }
    if (url.pathname === '/rest/v1/addon_images') {
      assert.equal(url.searchParams.get('id'), `eq.${id}`);
      if (mode === 'missing') {
        return Response.json([]);
      }
      return Response.json([
        {
          ...row,
          ...(mode === 'hidden' ? { is_published: false } : {}),
          ...(mode === 'path' ? { file_path: '../outside.png' } : {}),
          ...(mode === 'svg' ? { file_path: `${addonId}/${id}.svg` } : {}),
          addons: {
            ...parent,
            ...(mode === 'parent' ? { status: 'draft' } : {}),
            ...(mode === 'unapproved' ? { distribution_approved: false } : {}),
            ...(mode === 'future' ? { published_at: '2999-01-01T00:00:00Z' } : {}),
            categories: { is_visible: mode !== 'category' },
          },
        },
      ]);
    }
    assert.equal(url.pathname, `/storage/v1/object/sign/addon-images/${path}`);
    signs++;
    assert.deepEqual(JSON.parse(String(init?.body)), { expiresIn: 60 });
    if (mode === 'withdrawn') {
      return Response.json({ error: 'denied' }, { status: 403 });
    }
    if (mode === 'sign-offline') {
      return Response.json({ error: 'private' }, { status: 500 });
    }
    return Response.json({
      signedURL:
        mode === 'malicious'
          ? 'https://evil.example/steal'
          : `/object/sign/addon-images/${path}?token=test-only`,
    });
  };
  const handler = createImageHandler(transport),
    server = createServer((req, res) => {
      void handler(req, res);
    });
  const previous = {
    url: process.env['SUPABASE_URL'],
    key: process.env['SUPABASE_PUBLISHABLE_KEY'],
  };
  process.env['SUPABASE_URL'] = 'https://example.supabase.co';
  process.env['SUPABASE_PUBLISHABLE_KEY'] = 'sb_publishable_publictestkey1234';
  context.after(async () => {
    server.closeAllConnections();
    for (const [key, value] of Object.entries({
      SUPABASE_URL: previous.url,
      SUPABASE_PUBLISHABLE_KEY: previous.key,
    })) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/image?image=${id}`;
  const response = await fetch(base, {
    redirect: 'manual',
    headers: { Authorization: 'Bearer never-forward', Cookie: 'never-forward' },
  });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(
    new URL(response.headers.get('location')!).pathname,
    `/storage/v1/object/sign/addon-images/${path}`,
  );
  for (const hidden of [
    'hidden',
    'parent',
    'unapproved',
    'future',
    'category',
    'path',
    'svg',
    'missing',
  ]) {
    mode = hidden;
    const before = signs;
    assert.equal((await fetch(base, { redirect: 'manual' })).status, 404);
    assert.equal(signs, before);
  }
  for (const failed of ['offline', 'sign-offline', 'malicious']) {
    mode = failed;
    const failedResponse = await fetch(base, { redirect: 'manual' });
    assert.equal(failedResponse.status, 503);
    assert.deepEqual(await failedResponse.json(), { error: 'image_unavailable' });
  }
  mode = 'withdrawn';
  assert.equal((await fetch(base, { redirect: 'manual' })).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal((await fetch(base.replace(id, 'not-an-id'))).status, 404);
  mode='ok';const resized=await fetch(base+'&size=thumb');assert.equal(resized.status,200);assert.equal(resized.headers.get('content-type'),'image/webp');assert.equal((await sharp(Buffer.from(await resized.arrayBuffer())).metadata()).width,2);
  assert.equal((await fetch(base+'&size=arbitrary')).status,400);
});
