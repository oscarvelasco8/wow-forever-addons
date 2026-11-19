import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdminAccess } from '../../core/auth/admin-access';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'app-access-denied',
  imports: [AuthShell, RouterLink],
  template: `
    <app-auth-shell title="Este espacio está reservado." eyebrow="Acceso no autorizado" description="Tener una cuenta no concede permisos para administrar la plataforma.">
      <p class="muted">Si formas parte del equipo, pide al responsable del proyecto que revise tus permisos. Mientras tanto, puedes seguir explorando el catálogo.</p>
      <a class="button secondary" routerLink="/catalogo">Volver al catálogo ↗</a>
      @if (access.configured) { <p><button type="button" (click)="signOut()">Cerrar sesión</button></p> }
    </app-auth-shell>
  `,
  styles: `p { font-size: .85rem; } button { border: 0; background: transparent; color: var(--gold); text-decoration: underline; padding: 12px 0; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDenied {
  readonly access = inject(AdminAccess);
  private readonly router = inject(Router);
  async signOut(): Promise<void> {
    try { await this.access.signOut(); }
    catch { /* Local access is cleared even if the provider cannot sign out. */ }
    await this.router.navigateByUrl('/administracion/acceso');
  }
}
