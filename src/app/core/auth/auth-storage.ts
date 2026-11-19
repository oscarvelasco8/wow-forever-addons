import type { SupportedStorage } from '@supabase/supabase-js';

const prefix = 'wfa-admin-auth';
const expirySuffix = '-expires-at';
export const isPkceKey = (key: string) => key.startsWith(`${prefix}-`) && key.endsWith('-code-verifier');

const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
/** Remember this browser for at most seven days; Auth/RLS still verify every access. */
export function createAuthStorage(tab: Storage, shared: Storage, now = Date.now): SupportedStorage {
  return {
    getItem(key) {
      if (!isPkceKey(key)) {
        const expires = Number(shared.getItem(prefix + expirySuffix));
        if (expires && expires <= now()) {
          shared.removeItem(key); tab.removeItem(key); return null;
        }
        const value = shared.getItem(key) ?? (shared.getItem(prefix+'-migrated') ? null : tab.getItem(key));
        if (value && !expires) {
          shared.setItem(prefix + expirySuffix, String(now() + sessionLifetime));
          shared.setItem(key, value); tab.removeItem(key);
          shared.setItem(prefix+'-migrated','1');
        }
        return value;
      }
      const expires = Number(shared.getItem(key + expirySuffix));
      if (!expires || expires <= now()) {
        shared.removeItem(key); shared.removeItem(key + expirySuffix);
        return null;
      }
      return shared.getItem(key);
    },
    setItem(key, value) {
      if (!isPkceKey(key)) {
        if (!shared.getItem(prefix + expirySuffix)) shared.setItem(prefix + expirySuffix, String(now() + sessionLifetime));
        shared.setItem(key, value); shared.setItem(prefix+'-migrated','1'); tab.removeItem(key); return;
      }
      shared.setItem(key + expirySuffix, String(now() + 60 * 60 * 1000));
      shared.setItem(key, value);
    },
    removeItem(key) {
      if (!isPkceKey(key)) { tab.removeItem(key); shared.removeItem(key); if(key===prefix){shared.removeItem(prefix + expirySuffix);shared.setItem(prefix+'-migrated','1');} return; }
      shared.removeItem(key); shared.removeItem(key + expirySuffix);
    },
  };
}

/** Failed /recover calls must not destroy the verifier for an already delivered email. */
export async function preservePkceOnFailure<T>(shared: Storage, action: () => Promise<T>,
  failed: (result: T) => boolean): Promise<T> {
  const keys = () => Array.from({ length: shared.length }, (_, i) => shared.key(i)!)
    .filter(key => isPkceKey(key) || (key.endsWith(expirySuffix) && isPkceKey(key.slice(0, -expirySuffix.length))));
  const snapshot = new Map(keys().map(key => [key, shared.getItem(key)!]));
  const restore = () => {
    for (const key of keys()) { shared.removeItem(key); }
    for (const [key, value] of snapshot) { shared.setItem(key, value); }
  };
  try {
    const result = await action();
    if (failed(result)) { restore(); }
    return result;
  } catch (error) { restore(); throw error; }
}

export class RecoveryRateLimitError extends Error {}
export class RecoveryBrowserError extends Error {}
