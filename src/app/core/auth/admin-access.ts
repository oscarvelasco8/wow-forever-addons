import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { RecoveryRateLimitError } from './auth-storage';

export type AccessDecision = 'signed-out' | 'admin' | 'forbidden' | 'mfa-required';
export type AccessState = AccessDecision | 'unconfigured' | 'checking' | 'error';

/** Future Supabase adapter must verify membership via RLS, never user_metadata. */
export interface AdminAuthGateway {
  readonly configured: boolean;
  readonly recoveryConfigured?: boolean;
  checkAccess(): Promise<AccessDecision>;
  signIn(email: string, password: string): Promise<AccessDecision>;
  requestRecovery(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const unavailable = async (): Promise<never> => { throw new Error('Auth is not configured.'); };

export const ADMIN_AUTH_GATEWAY = new InjectionToken<AdminAuthGateway>('AdminAuthGateway', {
  providedIn: 'root',
  factory: () => ({
    configured: false,
    checkAccess: unavailable,
    signIn: unavailable,
    requestRecovery: unavailable,
    signOut: async () => undefined,
  }),
});

@Injectable({ providedIn: 'root' })
export class AdminAccess {
  private readonly gateway = inject(ADMIN_AUTH_GATEWAY);
  readonly configured = this.gateway.configured;
  readonly recoveryConfigured = this.gateway.recoveryConfigured ?? this.configured;
  private readonly current = signal<AccessState>(this.configured ? 'signed-out' : 'unconfigured');
  readonly state = this.current.asReadonly();

  async checkAccess(): Promise<AccessState> {
    if (!this.configured) { this.current.set('unconfigured'); return 'unconfigured'; }
    this.current.set('checking');
    try {
      const decision = await this.gateway.checkAccess();
      this.current.set(decision);
      return decision;
    } catch {
      this.current.set('error');
      return 'error';
    }
  }

  async signIn(email: string, password: string): Promise<AccessState> {
    if (!this.configured) { return 'unconfigured'; }
    this.current.set('checking');
    try {
      const decision = await this.gateway.signIn(email.trim(), password);
      this.current.set(decision);
      return decision;
    } catch {
      this.current.set('error');
      return 'error';
    }
  }

  async requestRecovery(email: string): Promise<'unconfigured' | 'accepted' | 'rate-limited' | 'error'> {
    if (!this.recoveryConfigured) { return 'unconfigured'; }
    try {
      await this.gateway.requestRecovery(email.trim());
      return 'accepted';
    } catch (error) {
      if (error instanceof RecoveryRateLimitError) { return 'rate-limited'; }
      return 'error';
    }
  }

  async signOut(): Promise<void> {
    try { await this.gateway.signOut(); }
    finally { this.current.set(this.configured ? 'signed-out' : 'unconfigured'); }
  }
}
