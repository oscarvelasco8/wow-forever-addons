import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'app-admin-mfa',
  imports: [AuthShell, ReactiveFormsModule],
  template: `<app-auth-shell title="Una segunda llave." eyebrow="Verificación en dos pasos"
    description="Protege el acceso al equipo con tu aplicación autenticadora.">
    @if (loading()) { <p role="status">Comprobando tu cuenta…</p> }
    @else if (!factorId()) {
      <p class="setup-copy">Vincula una aplicación autenticadora en tu móvil. Después te pediremos su código cada vez que accedas.</p>
      <button class="button form-button" [disabled]="busy()" (click)="enroll()">Configurar autenticador</button>
    } @else {
      @if (qrCode()) {
        <div class="qr-panel"><img [src]="qrCode()" alt="Código QR privado para vincular tu aplicación autenticadora" width="220" height="220"></div>
        <p class="setup-copy">Escanea este QR con tu aplicación autenticadora e introduce el código de seis cifras. No compartas ni guardes una captura del QR.</p>
      }
      <form [formGroup]="form" (ngSubmit)="verify()" [attr.aria-busy]="busy()">
        <div class="field"><label for="mfa-code">Código de verificación</label>
          <input id="mfa-code" formControlName="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required>
        </div>
        <button class="button form-button" [disabled]="busy()">{{ busy() ? 'Verificando…' : 'Verificar y acceder' }}</button>
      </form>
    }
    @if (error()) { <p role="alert" class="form-error">{{ error() }}</p> }
    <button type="button" class="cancel-link" (click)="cancel()" [disabled]="busy()">Cerrar sesión y volver</button>
  </app-auth-shell>`,
  styleUrls: ['./auth-form.scss', './mfa.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMfa implements OnInit, OnDestroy {
  private readonly gateway = inject(SupabaseAdminGateway);
  private readonly router = inject(Router);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly factorId = signal('');
  readonly qrCode = signal('');
  readonly form = inject(NonNullableFormBuilder).group({ code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]] });
  private destroyed = false;

  async ngOnInit(): Promise<void> {
    try {
      const decision = await this.gateway.checkAccess();
      if (this.destroyed) { return; }
      if (decision !== 'mfa-required') {
        await this.router.navigateByUrl(decision === 'admin' ? '/administracion' :
          decision === 'forbidden' ? '/administracion/denegado' : '/administracion/acceso');
        return;
      }
      const setup = await this.gateway.prepareMfa();
      if (!this.destroyed) { this.factorId.set(setup.factorId); }
    } catch { this.error.set('No se ha podido preparar la verificación. Cierra sesión e inténtalo de nuevo.'); }
    finally { this.loading.set(false); }
  }

  async enroll(): Promise<void> {
    if (this.busy()) { return; }
    this.busy.set(true); this.error.set('');
    try {
      const setup = await this.gateway.prepareMfa(true);
      if (this.destroyed) { return; }
      this.factorId.set(setup.factorId);
      if (setup.qrCode?.startsWith('<svg')) {
        this.qrCode.set(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrCode)}`);
      } else if (setup.qrCode?.startsWith('data:image/svg+xml')) {
        this.qrCode.set(setup.qrCode);
      }
    } catch { this.error.set('No se ha podido configurar el autenticador. Inténtalo de nuevo.'); }
    finally { this.busy.set(false); }
  }

  async verify(): Promise<void> {
    if (this.busy() || this.form.invalid || !this.factorId()) { return; }
    this.busy.set(true); this.error.set('');
    try {
      const result = await this.gateway.verifyMfa(this.factorId(), this.form.getRawValue().code);
      if (result === 'admin') { this.qrCode.set(''); await this.router.navigateByUrl('/administracion'); }
      else if (result === 'forbidden') { await this.router.navigateByUrl('/administracion/denegado'); }
      else { this.error.set('No se ha podido verificar el acceso. Cierra sesión e inténtalo de nuevo.'); }
    } catch { this.error.set('Código no válido o caducado. Introduce el código actual de tu aplicación.'); }
    finally { this.form.reset(); this.busy.set(false); }
  }

  async cancel(): Promise<void> {
    if (this.busy()) { return; }
    this.busy.set(true); this.qrCode.set('');
    try { await this.gateway.signOut(); }
    finally { this.busy.set(false); await this.router.navigateByUrl('/administracion/acceso'); }
  }
  ngOnDestroy(): void { this.destroyed = true; this.qrCode.set(''); this.form.reset(); }
}
