import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { RecoveryRateLimitError } from '../../core/auth/auth-storage';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'app-admin-account', imports: [AuthShell, ReactiveFormsModule, RouterLink],
  template: `
    <app-auth-shell title="Tu correo de acceso." description="Cambia el correo de tu cuenta administrativa conservando tu contraseña, permisos y autenticador.">
      @if (loading()) { <p role="status">Comprobando tu cuenta…</p> }
      @if (account(); as current) {
        <p class="connection-note"><strong>Correo actual</strong>{{ current.email }}</p>
        @if (current.pending) { <p class="connection-note">Cambio pendiente a {{ current.pending }}.</p> }
        @if (!current.verified) {
          <p>Verifica tu sesión con el autenticador antes de solicitar un cambio.</p>
          <p class="form-links"><a routerLink="/administracion/verificar">Verificar mi sesión →</a></p>
        } @else if (!sent()) {
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="field"><label for="account-email">Nuevo correo electrónico</label>
              <input id="account-email" type="email" autocomplete="email" formControlName="email" maxlength="254" required [readOnly]="busy()" /></div>
            <p class="connection-note">Supabase puede pedir confirmación en el correo actual y en el nuevo. Abre los enlaces en este mismo navegador y dispositivo. No solicites varios cambios a la vez.</p>
            <button class="button form-button" type="submit" [disabled]="busy()">{{ busy() ? 'Solicitando…' : 'Solicitar cambio de correo' }}</button>
          </form>
        }
      }
      @if (sent()) { <p class="form-success" role="status">Solicitud enviada. Revisa ambas bandejas de entrada y completa las confirmaciones. El correo actual seguirá vigente hasta completar el cambio.</p> }
      @if (returned() && account()) { <p class="form-success" role="status">Enlace procesado. Arriba puedes comprobar el correo actual y si queda alguna confirmación pendiente.</p> }
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
      <p class="form-links"><a routerLink="/administracion">Volver a administración →</a></p>
      @if (!loading() && !account()) { <p class="form-links"><a routerLink="/administracion/acceso">Iniciar sesión →</a></p> }
    </app-auth-shell>`,
  styleUrl: './auth-form.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAccount {
  private readonly gateway = inject(SupabaseAdminGateway);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly returned = signal(false);
  readonly error = signal('');
  readonly account = signal<{ email: string; pending: string; verified: boolean } | null>(null);
  readonly form = inject(NonNullableFormBuilder).group({ email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]] });
  constructor() { afterNextRender(() => { void this.load(); }); }
  async load(): Promise<void> {
    const code = this.route.snapshot.queryParamMap.get('code') ?? '';
    const failed = this.route.snapshot.queryParamMap.has('error');
    this.location.replaceState('/administracion/cuenta');
    try {
      if (failed) { throw new Error('Invalid link.'); }
      this.account.set(await this.gateway.accountEmail(code));
      this.returned.set(!!code);
    } catch { this.error.set(code || failed ? 'No se ha podido validar el enlace. Usa el último correo y el navegador donde solicitaste el cambio.' : 'Inicia sesión y completa la verificación en dos pasos para gestionar tu correo.'); }
    finally { this.loading.set(false); }
  }
  async submit(): Promise<void> {
    if (this.busy() || this.sent()) { return; }
    this.error.set('');
    this.form.markAllAsTouched();
    const email = this.form.controls.email.value.trim();
    if (this.form.invalid || email.toLowerCase() === this.account()?.email.toLowerCase()) {
      this.error.set('Introduce un correo válido diferente del actual.'); return;
    }
    this.busy.set(true);
    try { await this.gateway.requestEmailChange(email); this.sent.set(true); this.form.reset(); }
    catch (error) { this.error.set(error instanceof RecoveryRateLimitError ? 'Se ha alcanzado el límite temporal de correos. Espera antes de volver a solicitarlo.' : 'No se pudo solicitar el cambio. Comprueba tu sesión o inténtalo más tarde.'); }
    finally { this.busy.set(false); }
  }
}
