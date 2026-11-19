export function supportLedgerConfig(env: NodeJS.ProcessEnv) {
  const key = env['SUPABASE_WEBHOOK_SECRET_KEY'];
  const raw = env['SUPABASE_URL'];
  if (!key || !/^sb_secret_[A-Za-z0-9_-]{16,}$/.test(key) || !raw) return null;
  const url = new URL(raw);
  if (url.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
  return { key, origin: url.origin };
}
