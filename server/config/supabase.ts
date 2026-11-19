export interface SupabasePublicConfig {
  readonly url: string;
  readonly publishableKey: string;
}

/** Server-only reader. Explicit output allowlist; never serialize process.env. */
export function readSupabasePublicConfig(
  environment: Readonly<Record<string, string | undefined>>,
): SupabasePublicConfig | null {
  const urlValue = environment['SUPABASE_URL']?.trim();
  const key = environment['SUPABASE_PUBLISHABLE_KEY']?.trim();
  if (!urlValue && !key) { return null; }
  if (!urlValue || !key) { throw new Error('Supabase public configuration is incomplete.'); }

  let url: URL;
  try { url = new URL(urlValue); }
  catch { throw new Error('Supabase public URL is invalid.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new Error('Supabase public URL is invalid.');
  }
  // Only the new publishable key format is accepted. Secret keys and legacy
  // service-role JWTs cannot accidentally be exported as public configuration.
  if (!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key)) {
    throw new Error('Supabase publishable key is invalid.');
  }
  return Object.freeze({ url: url.origin, publishableKey: key });
}
