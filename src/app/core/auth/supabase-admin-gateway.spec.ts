import { TestBed } from '@angular/core/testing';
import { SupabaseAdminGateway } from './supabase-admin-gateway';
import { createAuthStorage } from './auth-storage';

const mock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(), getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), stopAutoRefresh: vi.fn(),
    resetPasswordForEmail: vi.fn(), exchangeCodeForSession: vi.fn(), updateUser: vi.fn(), onAuthStateChange: vi.fn(),
    mfa: { listFactors: vi.fn(), enroll: vi.fn(), unenroll: vi.fn(), challengeAndVerify: vi.fn() },
  },
  rpc: vi.fn(), from: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => mock }));

describe('Supabase administrator adapter', () => {
  let gateway: SupabaseAdminGateway;
  beforeEach(async () => {
    vi.resetAllMocks(); sessionStorage.clear(); localStorage.clear();
    await createAuthStorage(sessionStorage, localStorage).setItem('wfa-admin-auth-code-verifier', '"test-only/recovery"');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true,
      json: async () => ({ url: 'https://example.supabase.co', publishableKey: 'sb_publishable_testpublickey12345' }) }));
    TestBed.configureTestingModule({});
    gateway = TestBed.inject(SupabaseAdminGateway);
    await gateway.initialize();
    mock.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    mock.rpc.mockResolvedValue({ data: 'mfa-required', error: null });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses a fixed same-origin recovery destination', async () => {
    vi.stubGlobal('location', { origin: 'http://192.168.1.137:4200' });
    mock.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await gateway.requestRecovery('owner@example.test');
    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith('owner@example.test', {
      redirectTo: `${location.origin}/administracion/restablecer`,
    });
  });

  it('does not send recovery mail from an origin absent from the allowlist', async () => {
    vi.stubGlobal('location', { origin: 'https://unconfigured.example.test' });
    await expect(gateway.requestRecovery('owner@example.test')).rejects.toThrow();
    expect(mock.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('distinguishes email throttling and prevents immediate duplicate requests', async () => {
    vi.stubGlobal('location', { origin: 'http://192.168.1.137:4200' });
    mock.auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 429, code: 'over_email_send_rate_limit' } });
    await expect(gateway.requestRecovery('owner@example.test')).rejects.toThrow();
    await expect(gateway.requestRecovery('owner@example.test')).rejects.toThrow();
    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledOnce();
    expect(await createAuthStorage(sessionStorage, localStorage).getItem('wfa-admin-auth-code-verifier')).toBe('"test-only/recovery"');
  });

  it('rejects a code from a non-recovery flow', async () => {
    mock.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mock.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    await expect(gateway.beginRecovery('one-use-code')).rejects.toThrow();
    await expect(gateway.finishRecovery('long-test-password')).rejects.toThrow();
    expect(mock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('requires recovery, verified membership and MFA before updating a password', async () => {
    mock.auth.onAuthStateChange.mockImplementation((callback) => {
      mock.auth.exchangeCodeForSession.mockImplementation(async () => {
        callback('PASSWORD_RECOVERY'); return { error: null };
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    expect(await gateway.beginRecovery('one-use-code')).toBe('mfa-required');
    await expect(gateway.finishRecovery('long-test-password')).rejects.toThrow();
    expect(mock.auth.updateUser).not.toHaveBeenCalled();
    mock.rpc.mockResolvedValue({ data: 'admin', error: null });
    mock.auth.updateUser.mockResolvedValue({ error: null });
    mock.auth.signOut.mockResolvedValue({ error: null });
    await gateway.finishRecovery('long-test-password');
    expect(mock.auth.updateUser).toHaveBeenCalledWith({ password: 'long-test-password' });
    expect(mock.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    await expect(gateway.finishRecovery('long-test-password')).rejects.toThrow();
  });

  it('rejects an expired code even if a previous session is still cached', async () => {
    mock.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mock.auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('expired') });
    mock.rpc.mockResolvedValue({ data: 'admin', error: null });
    await expect(gateway.beginRecovery('expired-code')).rejects.toThrow();
    await expect(gateway.finishRecovery('long-test-password')).rejects.toThrow();
    expect(mock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('never authorizes from cached session data when server validation fails', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
    await expect(gateway.checkAccess()).rejects.toThrow();
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('uses the server decision, including MFA and immediate revocation', async () => {
    expect(await gateway.checkAccess()).toBe('mfa-required');
    mock.rpc.mockResolvedValue({ data: 'admin', error: null });
    expect(await gateway.checkAccess()).toBe('admin');
    mock.rpc.mockResolvedValue({ data: 'forbidden', error: null });
    expect(await gateway.checkAccess()).toBe('forbidden');
    expect(mock.rpc).toHaveBeenCalledWith('admin_access');
  });

  it('does not create an MFA credential just by visiting verification', async () => {
    mock.auth.mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [] }, error: null });
    expect(await gateway.prepareMfa()).toEqual({ factorId: '' });
    expect(mock.auth.mfa.enroll).not.toHaveBeenCalled();
  });

  it('revalidates membership and MFA before draft reads and writes', async () => {
    for (const decision of ['forbidden', 'mfa-required']) {
      mock.rpc.mockResolvedValue({ data: decision, error: null });
      await expect(gateway.listDrafts()).rejects.toThrow();
      await expect(gateway.loadDraft('draft-id')).rejects.toThrow();
      await expect(gateway.listEditorial()).rejects.toThrow();
      await expect(gateway.loadCategories()).rejects.toThrow();
      await expect(gateway.saveCategory({name:'Test',slug:'test',order:0,visible:false},'Motivo de prueba')).rejects.toThrow();
      await expect(gateway.loadEditorial('addon')).rejects.toThrow();
      await expect(gateway.loadAssetBundle('addon')).rejects.toThrow();
      await expect(gateway.editorialImageBlob('addon','image')).rejects.toThrow();
      await expect(gateway.editorialAction({addonId:'addon',entity:'addon',id:'addon',expected:'timestamp',action:'approve',note:'Revisión de prueba'})).rejects.toThrow();
      await expect(gateway.uploadDraftZip('addon', 'release', 'timestamp', {} as File)).rejects.toThrow();
      await expect(gateway.uploadDraftImage('addon', {} as File, 'Alt', 0)).rejects.toThrow();
      await expect(gateway.createDraftRelease('addon', { version: '1', game_version: 'test', interface_version: 1, changelog: '' })).rejects.toThrow();
      expect(mock.from).not.toHaveBeenCalled();
    }
  });

  it('rejects MFA enrollment by an account without membership', async () => {
    mock.rpc.mockResolvedValue({ data: 'forbidden', error: null });
    await expect(gateway.prepareMfa(true)).rejects.toThrow();
    expect(mock.auth.mfa.enroll).not.toHaveBeenCalled();
  });

  it('checks permissions again after verifying the second factor', async () => {
    mock.auth.mfa.challengeAndVerify.mockResolvedValue({ error: null });
    mock.rpc.mockResolvedValue({ data: 'forbidden', error: null });
    expect(await gateway.verifyMfa('factor', '123456')).toBe('forbidden');
  });

  it('removes tab credentials even when remote sign-out fails', async () => {
    await gateway.checkAccess();
    sessionStorage.setItem('wfa-admin-auth', 'test-session');
    mock.auth.signOut.mockResolvedValue({ error: new Error('offline') });
    await expect(gateway.signOut()).rejects.toThrow();
    expect(sessionStorage.getItem('wfa-admin-auth')).toBeNull();
    expect(mock.auth.stopAutoRefresh).toHaveBeenCalled();
  });
});
