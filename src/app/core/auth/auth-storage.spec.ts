import { createClient } from '@supabase/supabase-js';
import { createAuthStorage, preservePkceOnFailure } from './auth-storage';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, clear: () => values.clear(),
    key: index => Array.from(values.keys())[index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); } };
}

describe('Recovery storage with the installed Supabase SDK', () => {
  it('shares remembered sessions and independently expires PKCE material', async () => {
    const shared = memoryStorage();
    let now = 100;
    const first = createAuthStorage(memoryStorage(), shared, () => now);
    const second = createAuthStorage(memoryStorage(), shared, () => now);
    await first.setItem('wfa-admin-auth', 'fake-session');
    await first.setItem('wfa-admin-auth-code-verifier', 'fake-verifier');
    expect(await second.getItem('wfa-admin-auth')).toBe('fake-session');
    expect(await second.getItem('wfa-admin-auth-code-verifier')).toBe('fake-verifier');
    now += 60 * 60 * 1000;
    expect(await second.getItem('wfa-admin-auth-code-verifier')).toBeNull();
    expect(await second.getItem('wfa-admin-auth')).toBe('fake-session');
    now += 7*24*60*60*1000;
    expect(await second.getItem('wfa-admin-auth')).toBeNull();
  });
  it('migrates a tab session, keeps an absolute expiry during refresh and clears every copy on logout',async()=>{
    const tab=memoryStorage(),shared=memoryStorage();let now=100;tab.setItem('wfa-admin-auth','old-session');
    const storage=createAuthStorage(tab,shared,()=>now);expect(await storage.getItem('wfa-admin-auth')).toBe('old-session');expect(tab.getItem('wfa-admin-auth')).toBeNull();
    const expiry=shared.getItem('wfa-admin-auth-expires-at');now+=1000;await storage.setItem('wfa-admin-auth','refreshed-session');expect(shared.getItem('wfa-admin-auth-expires-at')).toBe(expiry);
    await storage.removeItem('wfa-admin-auth');expect(shared.getItem('wfa-admin-auth')).toBeNull();expect(await storage.getItem('wfa-admin-auth')).toBeNull();
    const oldTab=memoryStorage();oldTab.setItem('wfa-admin-auth','stale-tab-session');expect(await createAuthStorage(oldTab,shared,()=>now).getItem('wfa-admin-auth')).toBeNull();
  });

  it('restores the previous verifier if another request is rate-limited', async () => {
    const shared = memoryStorage();
    const storage = createAuthStorage(memoryStorage(), shared);
    await storage.setItem('wfa-admin-auth-code-verifier', 'delivered-email-verifier');
    await preservePkceOnFailure(shared, async () => {
      await storage.setItem('wfa-admin-auth-code-verifier', 'failed-request-verifier');
      await storage.setItem('wfa-admin-auth-flow-new-code-verifier', 'failed-request-slot');
      return { error: { status: 429 } };
    }, result => !!result.error);
    expect(await storage.getItem('wfa-admin-auth-code-verifier')).toBe('delivered-email-verifier');
    expect(await storage.getItem('wfa-admin-auth-flow-new-code-verifier')).toBeNull();
  });

  it('exchanges a recovery code in a different tab using the real SDK and a stub Auth server', async () => {
    const shared = memoryStorage();
    const firstTab = memoryStorage();
    const secondTab = memoryStorage();
    const now = Math.floor(Date.now() / 1000);
    const token = [btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ sub: 'test-user', exp: now + 3600, iat: now })), 'testsignature'].join('.');
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/recover')) { return new Response('{}', { status: 200 }); }
      if (url.includes('/token')) {
        const body = JSON.parse(String(init?.body));
        const verifier = JSON.parse(shared.getItem('wfa-admin-auth-code-verifier')!).split('/')[0];
        expect(body.code_verifier).toBe(verifier);
        return new Response(JSON.stringify({ access_token: token, refresh_token: 'test-refresh',
          expires_in: 3600, token_type: 'bearer', user: { id: 'test-user', aud: 'authenticated',
            app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }), { status: 200 });
      }
      throw new Error('Unexpected test request');
    });
    const makeClient = (tab: Storage) => createClient('https://example.supabase.co', 'test-public-key', {
      auth: { storage: createAuthStorage(tab, shared), storageKey: 'wfa-admin-auth',
        flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: false,
        lock: async (_name, _timeout, action) => action() }, global: { fetch: transport },
    });
    const first = makeClient(firstTab);
    expect((await first.auth.resetPasswordForEmail('test@example.test')).error).toBeNull();
    const second = makeClient(secondTab);
    let recoveryEvent = false;
    const listener = second.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') { recoveryEvent = true; } });
    const exchange = await second.auth.exchangeCodeForSession('test-one-use-code');
    expect(exchange.error).toBeNull();
    expect(recoveryEvent).toBe(true);
    expect(firstTab.getItem('wfa-admin-auth')).toBeNull();
    expect(secondTab.getItem('wfa-admin-auth')).toBeNull();
    expect(shared.getItem('wfa-admin-auth')).not.toBeNull();
    listener.data.subscription.unsubscribe();
    first.auth.stopAutoRefresh(); second.auth.stopAutoRefresh();
  });
});
