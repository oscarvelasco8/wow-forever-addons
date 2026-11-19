import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { readSupabasePublicConfig } from '../server/config/supabase.ts';

const config = readSupabasePublicConfig(process.env);
assert.ok(config, 'Supabase public configuration required.');
const client = createClient(config.url, config.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
// No account, credentials, SQL claims or service_role. Requests use the public key.
for (const bucket of ['addon-files', 'addon-images']) {
  const path = `_verification/${randomUUID()}.${bucket === 'addon-files' ? 'zip' : 'png'}`;
  const storage = client.storage.from(bucket);
  const list = await storage.list('_verification');
  assert.ok(!list.data?.length, 'Anonymous listing exposed objects.');
  const upload = await storage.upload(path, new Uint8Array([0]), {
    contentType: bucket === 'addon-files' ? 'application/zip' : 'image/png',
  });
  assert.ok(upload.error, 'Anonymous upload unexpectedly succeeded.');
  const download = await storage.download(path);
  assert.ok(download.error, 'Anonymous download unexpectedly succeeded.');
  const signed = await storage.createSignedUrl(path, 30);
  assert.ok(signed.error, 'Anonymous signing unexpectedly succeeded.');
  const response = await fetch(`${config.url}/storage/v1/object/public/${bucket}/${path}`, {
    signal: AbortSignal.timeout(20000),
  });
  assert.ok(!response.ok, 'Private bucket allowed public URL access.');
  console.log(`OK ${bucket}: empty anonymous listing, upload/download/signing denied; public URL denied (${response.status}).`);
}
console.log('Only anonymous HTTP checks completed; authenticated fixtures remain a separate check.');
