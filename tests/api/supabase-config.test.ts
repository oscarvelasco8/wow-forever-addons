import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSupabasePublicConfig } from '../../server/config/supabase.ts';

test('public configuration exports only allowed fields and rejects secret keys without echoing them', () => {
  assert.equal(readSupabasePublicConfig({}), null);
  const valid = {
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_for_tests_only',
    SUPABASE_SECRET_KEY: 'sb_secret_never_export_this_test_value',
  };
  assert.deepEqual(readSupabasePublicConfig(valid), {
    url: 'https://example.supabase.co',
    publishableKey: valid.SUPABASE_PUBLISHABLE_KEY,
  });
  const secret = 'sb_secret_example_for_tests_only';
  assert.throws(() => readSupabasePublicConfig({ ...valid, SUPABASE_PUBLISHABLE_KEY: secret }),
    (error: unknown) => error instanceof Error && !error.message.includes(secret));
  assert.throws(() => readSupabasePublicConfig({ ...valid, SUPABASE_URL: 'http://example.com' }));
  assert.throws(() => readSupabasePublicConfig({ ...valid, SUPABASE_URL: 'https://user:password@example.com' }));
  assert.throws(() => readSupabasePublicConfig({ ...valid, SUPABASE_URL: 'https://example.com/?secret=test' }));
  assert.throws(() => readSupabasePublicConfig({ SUPABASE_URL: valid.SUPABASE_URL }));
  assert.equal(readSupabasePublicConfig({ ...valid, SUPABASE_URL: 'http://127.0.0.1:54321' })?.url,
    'http://127.0.0.1:54321');
});
