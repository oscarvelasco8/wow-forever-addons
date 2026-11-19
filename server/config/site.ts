/** Explicit canonical origin, never derived from caller Host/X-Forwarded-Host. */
export function readSiteOrigin(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  const url = new URL(value.trim());
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
  ) {
    throw new Error('Invalid public site origin.');
  }
  return url.origin;
}
