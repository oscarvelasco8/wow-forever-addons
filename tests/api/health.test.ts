import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import health from '../../api/health.ts';

test('health returns a minimal uncached response and rejects writes', async (context) => {
  const server = createServer(health);
  server.listen(0, '127.0.0.1');
  context.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/health`;

  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok' });

  const writeResponse = await fetch(url, { method: 'POST' });
  assert.equal(writeResponse.status, 405);
  assert.equal(writeResponse.headers.get('allow'), 'GET');
  assert.deepEqual(await writeResponse.json(), { error: 'method_not_allowed' });
});
