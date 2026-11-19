import assert from 'node:assert/strict';
import { readSupabasePublicConfig } from '../server/config/supabase.ts';

// Read-only verification against the configured project. Never log keys or responses.
const config = readSupabasePublicConfig(process.env);
assert.ok(config, 'Configure Supabase in the local .env first.');

async function request(path: string, extraHeaders: Record<string, string> = {}) {
  return fetch(`${config!.url}${path}`, {
    headers: { apikey: config!.publishableKey, ...extraHeaders },
    signal: AbortSignal.timeout(20_000),
  });
}

for (const table of ['categories', 'addons', 'addon_releases', 'addon_images']) {
  const response = await request(`/rest/v1/${table}?select=*&limit=1`);
  assert.equal(response.status, 200, `Anonymous read failed for ${table}.`);
  const rows: unknown = await response.json();
  assert.ok(Array.isArray(rows), `Invalid response for ${table}.`);
  // Drafts must never appear in an anonymous result, including after publication starts.
  if (table === 'addons' || table === 'addon_releases') {
    assert.ok(rows.every((row: { status?: string }) => row.status === 'published'),
      `An unpublished row is exposed in ${table}.`);
  }
  console.log(`OK: anonymous ${table} read (${rows.length} sampled rows).`);
}

const privateResponse = await request('/rest/v1/admin_users?select=user_id', {
  'Accept-Profile': 'private',
});
assert.equal(privateResponse.status, 406, 'Private schema should not be exposed.');
const privateError = await privateResponse.json() as { code?: string };
assert.equal(privateError.code, 'PGRST106', 'Expected an unexposed schema response.');
console.log('OK: private schema is not exposed by the Data API.');

const settingsResponse = await request('/auth/v1/settings');
assert.equal(settingsResponse.status, 200, 'Auth settings request failed.');
const settings = await settingsResponse.json() as { disable_signup?: boolean };
assert.equal(settings.disable_signup, true, 'Public sign-up must remain disabled.');
console.log('OK: Auth public sign-up is disabled.');

const rpc = await fetch(`${config.url}/rest/v1/rpc/admin_access`, {
  method: 'POST', headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
  body: '{}', signal: AbortSignal.timeout(20_000),
});
assert.ok([401, 403].includes(rpc.status), 'Anonymous callers must not invoke admin_access.');
console.log('OK: anonymous administrative RPC access is denied.');
