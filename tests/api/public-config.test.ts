import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import publicConfig from '../../api/public-config.ts';

test('public config endpoint exposes only allowed values and fails closed', async (context) => {
  const previous = { url: process.env['SUPABASE_URL'], key: process.env['SUPABASE_PUBLISHABLE_KEY'], secret: process.env['SUPABASE_SECRET_KEY'] };
  const server = createServer(publicConfig);
  context.after(async () => {
    for (const [name, value] of Object.entries({ SUPABASE_URL: previous.url, SUPABASE_PUBLISHABLE_KEY: previous.key, SUPABASE_SECRET_KEY: previous.secret })) {
      if (value === undefined) { delete process.env[name]; } else { process.env[name] = value; }
    }
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/public-config`;
  process.env['SUPABASE_URL'] = 'https://example.supabase.co';
  process.env['SUPABASE_PUBLISHABLE_KEY'] = 'sb_publishable_publictestkey1234';
  process.env['SUPABASE_SECRET_KEY'] = 'test-secret-must-not-be-exported';
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_publictestkey1234' });
  process.env['SUPABASE_PUBLISHABLE_KEY'] = 'sb_secret_wrong-key';
  const invalid = await fetch(url);
  assert.equal(invalid.status, 503);
  assert.deepEqual(await invalid.json(), { error: 'unconfigured' });
  assert.equal((await fetch(url, { method: 'POST' })).status, 405);
});
