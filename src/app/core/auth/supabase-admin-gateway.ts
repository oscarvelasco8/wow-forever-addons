import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminAuthGateway, AccessDecision } from './admin-access';
import type { Database } from '../supabase/database.types';
import type { DraftFields, ReleaseFields } from '../catalog/admin-drafts';
import type { EditorialCommand } from '../catalog/admin-editorial';
import type { CategoryInput } from '../catalog/admin-categories';
import { createAuthStorage, preservePkceOnFailure, RecoveryRateLimitError, RecoveryBrowserError } from './auth-storage';
import {announceCatalogChange} from '../catalog/catalog-updates';

@Injectable({ providedIn: 'root' })
export class SupabaseAdminGateway implements AdminAuthGateway {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private config: { url: string; publishableKey: string } | null = null;
  private clientPromise?: Promise<SupabaseClient<Database>>;
  private recoveryReady = false;
  get recoveryConfigured(): boolean {
    // Keep in sync with Auth's exact redirect allowlist; add production origin at deployment.
    return this.configured && this.browser && ['http://192.168.1.137:4200', 'https://wow-forever-addons.vercel.app'].includes(location.origin);
  }
  get configured(): boolean { return this.config !== null; }

  async initialize(): Promise<void> {
    if (!this.browser) { return; }
    try {
      const response = await fetch('/api/public-config', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) { return; }
      const config = await response.json();
      // Same-origin configuration still gets a client-side structural check.
      const url = new URL(config.url);
      if ((url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) ||
        url.username || url.password || !/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(config.publishableKey)) { return; }
      this.config = { url: url.origin, publishableKey: config.publishableKey };
    } catch { /* Missing configuration keeps access disabled. */ }
  }

  private client(): Promise<SupabaseClient<Database>> {
    const config = this.config;
    if (!config) { throw new Error('Auth unavailable.'); }
    return this.clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient<Database>(config.url, config.publishableKey, {
        auth: { persistSession: true, storage: createAuthStorage(sessionStorage, localStorage), autoRefreshToken: true,
          detectSessionInUrl: false, flowType: 'pkce', storageKey: 'wfa-admin-auth' },
      }));
  }

  async checkAccess(): Promise<AccessDecision> {
    const client = await this.client();
    const { data: session } = await client.auth.getSession();
    if (!session.session) { return 'signed-out'; }
    // getSession alone is never authorization. Auth server validates the user;
    // the RPC evaluates membership and AAL from the verified request JWT.
    const { data: user, error } = await client.auth.getUser();
    if (error || !user.user) { throw new Error('Session verification failed.'); }
    const result = await client.rpc('admin_access');
    if (result.error) { throw new Error('Access verification failed.'); }
    if (result.data === 'admin' || result.data === 'mfa-required' || result.data === 'forbidden') {
      return result.data;
    }
    throw new Error('Unexpected access decision.');
  }

  async signIn(email: string, password: string): Promise<AccessDecision> {
    const expiry=Number(localStorage.getItem('wfa-admin-auth-expires-at'));
    if(expiry&&expiry<=Date.now()){localStorage.removeItem('wfa-admin-auth');localStorage.removeItem('wfa-admin-auth-user');localStorage.removeItem('wfa-admin-auth-expires-at');sessionStorage.removeItem('wfa-admin-auth');}
    const client = await this.client();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) { throw new Error('Sign-in failed.'); }
    return this.checkAccess();
  }

  async requestRecovery(email: string): Promise<void> {
    if (!this.recoveryConfigured) { throw new Error('Recovery origin unavailable.'); }
    const client = await this.client();
    this.recoveryReady = false;
    const retryAt = Number(localStorage.getItem('wfa-recovery-retry-at'));
    if (retryAt > Date.now()) { throw new RecoveryRateLimitError(); }
    const { error } = await preservePkceOnFailure(localStorage, () => client.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/administracion/restablecer`,
    }), result => !!result.error);
    if (error?.status === 429) {
      localStorage.setItem('wfa-recovery-retry-at', String(Date.now() + 60 * 60 * 1000));
      throw new RecoveryRateLimitError();
    }
    if (error) { throw new Error('Recovery request failed.'); }
    localStorage.removeItem('wfa-recovery-retry-at');
  }

  async beginRecovery(code: string): Promise<AccessDecision> {
    this.recoveryReady = false;
    if (!code || code.length > 2048) { throw new Error('Invalid recovery link.'); }
    const client = await this.client();
    if (!await createAuthStorage(sessionStorage, localStorage).getItem('wfa-admin-auth-code-verifier')) {
      throw new RecoveryBrowserError();
    }
    let recoveryEvent = false;
    const { data: listener } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { recoveryEvent = true; }
    });
    try {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error || !recoveryEvent) { throw new Error('Invalid recovery link.'); }
    } finally { listener.subscription.unsubscribe(); }
    const decision = await this.checkAccess();
    if (decision !== 'admin' && decision !== 'mfa-required') { throw new Error('Recovery denied.'); }
    this.recoveryReady = true;
    return decision;
  }

  async finishRecovery(password: string): Promise<void> {
    if (!this.recoveryReady || password.length < 12 || password.length > 128 ||
      await this.checkAccess() !== 'admin') { throw new Error('Recovery denied.'); }
    const client = await this.client();
    const { error } = await client.auth.updateUser({ password });
    if (error) { throw new Error('Password update failed.'); }
    this.recoveryReady = false;
    await this.signOut();
  }

  async signOut(): Promise<void> {
    this.recoveryReady = false;
    if (!this.clientPromise) { return; }
    const client = await this.clientPromise;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) { throw new Error('Sign-out failed.'); }
    } finally {
      // Do not leave credentials in this tab if revocation fails offline.
      sessionStorage.removeItem('wfa-admin-auth');
      localStorage.removeItem('wfa-admin-auth');
      localStorage.removeItem('wfa-admin-auth-user');
      localStorage.removeItem('wfa-admin-auth-expires-at');
      sessionStorage.removeItem('wfa-admin-auth-code-verifier');
      client.auth.stopAutoRefresh();
      this.clientPromise = undefined;
    }
  }

  async prepareMfa(enroll = false): Promise<{ factorId: string; qrCode?: string }> {
    if (await this.checkAccess() !== 'mfa-required') { throw new Error('MFA access denied.'); }
    const client = await this.client();
    const { data, error } = await client.auth.mfa.listFactors();
    if (error) { throw new Error('MFA unavailable.'); }
    const factor = data.totp.find((entry) => entry.status === 'verified');
    if (factor) { return { factorId: factor.id }; }
    // Enrollment creates an authentication credential, so it requires an explicit
    // click by the account owner. Rendering this page never enrolls automatically.
    if (!enroll) { return { factorId: '' }; }
    for (const pending of data.all.filter((entry) => entry.factor_type === 'totp' && entry.status === 'unverified')) {
      const { error: cleanupError } = await client.auth.mfa.unenroll({ factorId: pending.id });
      if (cleanupError) { throw new Error('MFA setup unavailable.'); }
    }
    const result = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'WoW Forever Addons' });
    if (result.error) { throw new Error('MFA setup failed.'); }
    return { factorId: result.data.id, qrCode: result.data.totp.qr_code };
  }

  async verifyStorage(): Promise<string[]> {
    if (await this.checkAccess() !== 'admin' || !this.config) { throw new Error('Access denied.'); }
    const [{ verifyStorage }, { createClient }] = await Promise.all([
      import('../supabase/verify-storage'), import('@supabase/supabase-js'),
    ]);
    const anonymous = createClient<Database>(this.config.url, this.config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return verifyStorage(await this.client(), anonymous);
  }

  async verifyMfa(factorId: string, code: string): Promise<AccessDecision> {
    const client = await this.client();
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) { throw new Error('MFA verification failed.'); }
    return this.checkAccess();
  }

  async verifyPublication(): Promise<string[]> {
    if (await this.checkAccess() !== 'admin' || !this.config) { throw new Error('Access denied.'); }
    const [{ verifyPublication }, { createClient }] = await Promise.all([
      import('../supabase/verify-publication'), import('@supabase/supabase-js'),
    ]);
    const visitor = createClient<Database>(this.config.url, this.config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    return verifyPublication(await this.client(), visitor);
  }

  private async draftClient(): Promise<SupabaseClient<Database>> {
    if (await this.checkAccess() !== 'admin') { throw new Error('La sesión administrativa no está verificada. Vuelve a acceder con tu autenticador.'); }
    return this.client();
  }
  async listDrafts() { const client = await this.draftClient(); return (await import('../catalog/admin-drafts')).listDrafts(client); }
  async listEditorial() { const client = await this.draftClient(); return (await import('../catalog/admin-editorial')).listEditorial(client); }
  async loadDeletionStatus(){const client=await this.draftClient();return(await import('../catalog/addon-deletion')).loadDeletionStatus(client);}
  async deleteAddon(addon:import('../catalog/admin-drafts').DraftAddon,name:string){const client=await this.draftClient();return(await import('../catalog/addon-deletion')).deleteAddon(client,addon,name);}
  async loadCategories() { const client=await this.draftClient();return (await import('../catalog/admin-categories')).loadCategories(client); }
  async saveCategory(input:CategoryInput,note:string) { const client=await this.draftClient();try{return await (await import('../catalog/admin-categories')).saveCategory(client,input,note);}finally{announceCatalogChange();} }
  async loadAssetBundle(id: string) { const client = await this.draftClient(); return (await import('../catalog/admin-assets')).loadAssetBundle(client,id); }
  async loadEditorial(id: string) { const client = await this.draftClient(); return (await import('../catalog/admin-editorial')).loadEditorial(client,id); }
  async editorialAction(command: EditorialCommand) { const client = await this.draftClient();try{return await (await import('../catalog/admin-editorial')).editorialAction(client,command);}finally{announceCatalogChange();} }
  async editorialImageBlob(addonId: string,id: string) { const client = await this.draftClient(); return (await import('../catalog/admin-editorial')).editorialImageBlob(client,addonId,id); }
  async loadDraft(id: string) { const client = await this.draftClient(); return (await import('../catalog/admin-drafts')).loadDraft(client, id); }
  async createDraft(id: string, input: DraftFields) {
    const client = await this.draftClient(); return (await import('../catalog/admin-drafts')).createDraft(client, id, input);
  }
  async publishPreparedAddon(id:string,release:string,expected:string,images:boolean,permission:boolean){
    const client=await this.draftClient();return(await import('../catalog/guided-publication')).publishPreparedAddon(client,id,release,expected,images,permission);
  }
  async saveDraft(id: string, updatedAt: string, input: DraftFields) {
    const client = await this.draftClient(); return (await import('../catalog/admin-drafts')).saveDraft(client, id, updatedAt, input);
  }
  async saveDraftRelease(addonId: string, id: string, updatedAt: string, input: ReleaseFields) {
    const client = await this.draftClient(); return (await import('../catalog/admin-drafts')).saveDraftRelease(client, addonId, id, updatedAt, input);
  }
  async createDraftRelease(addonId: string, input: ReleaseFields) {
    const client = await this.draftClient(); return (await import('../catalog/admin-assets')).createDraftRelease(client, addonId, input);
  }
  async uploadDraftZip(addonId: string, id: string, updatedAt: string, file: File) {
    const client = await this.draftClient(); return (await import('../catalog/admin-assets')).uploadDraftZip(client, addonId, id, updatedAt, file);
  }
  async uploadDraftImage(addonId: string, file: File, alt: string, order: number) {
    const client = await this.draftClient(); return (await import('../catalog/admin-assets')).uploadDraftImage(client, addonId, file, alt, order);
  }
  async loadDraftImages(addonId: string) {
    const client = await this.draftClient(); return (await import('../catalog/admin-assets')).loadDraftImages(client, addonId);
  }
  async draftImageBlob(addonId: string, id: string) {
    const client = await this.draftClient(); return (await import('../catalog/admin-assets')).draftImageBlob(client, addonId, id);
  }
  async changeDraftAsset(target: import('../catalog/asset-changes').AssetTarget,note:string,file:File|null){
    const client=await this.draftClient();return(await import('../catalog/asset-changes')).changeDraftAsset(client,target,note,file);
  }
  async draftAssetStatus(id:string){const client=await this.draftClient();return(await import('../catalog/asset-changes')).draftAssetStatus(client,id);}
  async cleanupRetiredAsset(addon:string,id:string,bucket:string,path:string){
    const client=await this.draftClient();return(await import('../catalog/asset-changes')).cleanupRetiredAsset(client,addon,id,bucket,path);
  }
}
