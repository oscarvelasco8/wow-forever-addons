import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAccess } from '../../core/auth/admin-access';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'app-admin-login',
  imports: [AuthShell, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLogin {
  readonly access = inject(AdminAccess);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly busy = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(1024)]],
  });

  constructor() {
    if (!this.access.configured) { this.form.disable({ emitEvent: false }); }
  }

  async submit(): Promise<void> {
    if (!this.access.configured || this.busy()) { return; }
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error.set('Revisa el correo y la contraseña antes de continuar.'); return; }
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const result = await this.access.signIn(email, password);
      if (result === 'admin') { await this.router.navigateByUrl('/administracion'); }
      else if (result === 'mfa-required') { await this.router.navigateByUrl('/administracion/verificar'); }
      else if (result === 'forbidden') { await this.router.navigateByUrl('/administracion/denegado'); }
      else { this.error.set('No se ha podido iniciar sesión. Comprueba tus datos o inténtalo de nuevo más tarde.'); }
    } finally {
      this.form.controls.password.reset('');
      this.showPassword.set(false);
      this.busy.set(false);
    }
  }
}
