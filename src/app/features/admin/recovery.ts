import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminAccess } from '../../core/auth/admin-access';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'app-admin-recovery',
  imports: [AuthShell, ReactiveFormsModule, RouterLink],
  templateUrl: './recovery.html',
  styleUrl: './auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRecovery {
  readonly access = inject(AdminAccess);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly busy = signal(false);
  readonly accepted = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({ email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]] });

  constructor() {
    if (!this.access.recoveryConfigured) { this.form.disable({ emitEvent: false }); }
  }

  async submit(): Promise<void> {
    if (!this.access.recoveryConfigured || this.busy() || this.accepted()) { return; }
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error.set('Introduce un correo electrónico válido.'); return; }
    this.busy.set(true);
    try {
      const result = await this.access.requestRecovery(this.form.getRawValue().email);
      if (result === 'accepted') { this.accepted.set(true); this.form.reset(); }
      else if (result === 'rate-limited') { this.error.set('Supabase ha alcanzado el límite temporal de correos. Espera una hora antes de solicitar otro. No necesitas cambiar tu contraseña actual para iniciar sesión.'); }
      else { this.error.set('No se ha podido solicitar la recuperación. Inténtalo de nuevo más tarde.'); }
    } finally { this.busy.set(false); }
  }
}
