import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { AuthShell } from './auth-shell';
import { RecoveryBrowserError } from '../../core/auth/auth-storage';

@Component({
  selector: 'app-reset-password',
  imports: [AuthShell, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly gateway = inject(SupabaseAdminGateway);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly fb = inject(NonNullableFormBuilder);
  private factorId = '';
  readonly state = signal<'checking' | 'invalid' | 'mfa' | 'ready' | 'done'>('checking');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirmation: ['', Validators.required],
    code: [''],
  });

  constructor() { void this.initialize(); }

  private async initialize(): Promise<void> {
    const code = this.route.snapshot.queryParamMap.get('code') ?? '';
    // Remove one-time credentials from browser history before any asynchronous work.
    this.location.replaceState('/administracion/restablecer');
    try {
      const decision = await this.gateway.beginRecovery(code);
      if (decision === 'mfa-required') {
        const factor = await this.gateway.prepareMfa();
        if (!factor.factorId) { throw new Error('Verified factor required.'); }
        this.factorId = factor.factorId;
        this.state.set('mfa');
      } else { this.state.set('ready'); }
    } catch (error) {
      this.error.set(error instanceof RecoveryBrowserError
        ? 'Este navegador no conserva la comprobación de la solicitud. Usa el mismo navegador y dispositivo donde pediste el correo. Los enlaces anteriores a esta corrección necesitan una solicitud nueva.'
        : 'No se ha podido validar el enlace. Puede haber caducado, haberse utilizado ya o proceder de una solicitud anterior.');
      this.state.set('invalid');
    }
  }

  async submit(): Promise<void> {
    if (this.busy() || !['mfa', 'ready'].includes(this.state())) { return; }
    this.error.set('');
    this.busy.set(true);
    try {
      if (this.state() === 'mfa') {
        const code = this.form.controls.code.value.trim();
        if (!/^\d{6}$/.test(code) || await this.gateway.verifyMfa(this.factorId, code) !== 'admin') {
          throw new Error('MFA failed.');
        }
        this.state.set('ready');
      } else {
        const { password, confirmation } = this.form.getRawValue();
        if (this.form.controls.password.invalid || password !== confirmation) {
          this.error.set('Usa entre 12 y 128 caracteres y repite la misma contraseña.');
          return;
        }
        await this.gateway.finishRecovery(password);
        this.state.set('done');
      }
    } catch { this.error.set('No se ha podido completar el paso. Comprueba los datos o solicita otro enlace.'); }
    finally {
      this.form.reset();
      this.busy.set(false);
    }
  }
}
