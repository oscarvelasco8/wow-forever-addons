import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AdminAccess } from '../../core/auth/admin-access';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import type { DraftAddon } from '../../core/catalog/admin-drafts';

@Component({
  selector: 'app-admin-home',
  imports: [RouterLink],
  templateUrl: './admin-home.html', styleUrl: './admin-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHome {
  private readonly access = inject(AdminAccess);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  private readonly gateway = inject(SupabaseAdminGateway);
  readonly testing = signal(false);
  readonly results = signal<string[]>([]);
  readonly drafts = signal<DraftAddon[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  constructor() {
    const meta = inject(Meta); meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
    void this.loadDrafts();
  }
  async loadDrafts(): Promise<void> {
    if (this.testing()) { return; }
    this.loading.set(true); this.loadError.set('');
    try { this.drafts.set(await this.gateway.listEditorial()); }
    catch { this.loadError.set('No se pudieron cargar los borradores. Comprueba tu sesión y vuelve a intentarlo.'); }
    finally { this.loading.set(false); }
  }
  async verifyStorage(): Promise<void> {
    if (this.testing()) { return; }
    this.testing.set(true);
    this.results.set([]);
    try { this.results.set(await this.gateway.verifyStorage()); }
    catch (error) { this.results.set([error instanceof Error ? error.message : 'No se completó la prueba.']); }
    finally { this.testing.set(false); }
  }
  async logout(): Promise<void> {
    if (this.busy()) { return; }
    this.busy.set(true);
    try { await this.access.signOut(); }
    finally { this.busy.set(false); await this.router.navigateByUrl('/administracion/acceso'); }
  }
  async verifyPublication(): Promise<void> {
    if (this.testing()) { return; }
    this.testing.set(true); this.results.set([]);
    try { this.results.set(await this.gateway.verifyPublication()); }
    catch (error) { this.results.set([error instanceof Error ? error.message : 'No se completó la prueba.']); }
    finally { this.testing.set(false); }
  }
}
