import {
  afterNextRender,
  Injector,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AdminAccess } from '../../core/auth/admin-access';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import type { DraftAddon } from '../../core/catalog/admin-drafts';

@Component({
  selector: 'app-admin-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.scss',
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
  readonly pendingDeletions = signal<string[]>([]);
  readonly deletionReady = signal(false);
  readonly action = signal<{ kind: 'withdraw' | 'delete'; addon: DraftAddon } | null>(null);
  readonly typedName = signal('');
  readonly actionError = signal('');
  readonly actionSuccess = signal('');
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  constructor() {
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
    void this.loadDrafts();
  }
  async loadDrafts(): Promise<void> {
    if (this.testing() || this.busy()) {
      return;
    }
    this.loading.set(true);
    this.loadError.set('');
    try {
      const [addons, deletion] = await Promise.all([
        this.gateway.listEditorial(),
        this.gateway.loadDeletionStatus().catch(() => ({ ready: false, pending: [] })),
      ]);
      this.drafts.set(addons);
      this.pendingDeletions.set(deletion.pending);
      this.deletionReady.set(deletion.ready);
    } catch {
      this.loadError.set(
        'No se pudieron cargar los borradores. Comprueba tu sesión y vuelve a intentarlo.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  openAction(kind: 'withdraw' | 'delete', addon: DraftAddon): void {
    if (this.busy() || this.testing()) return;
    this.action.set({ kind, addon });
    this.typedName.set('');
    this.actionError.set('');
    this.actionSuccess.set('');
    afterNextRender(
      () =>
        this.document
          .getElementById(kind === 'delete' ? 'delete-addon-name' : 'quick-action-confirm')
          ?.focus(),
      { injector: this.injector },
    );
  }
  async confirmAction(): Promise<void> {
    const action = this.action();
    if (!action || this.busy() || this.testing()) return;
    if (action.kind === 'delete' && this.typedName() !== action.addon.name) {
      this.actionError.set('Escribe el nombre completo para confirmar.');
      return;
    }
    this.busy.set(true);
    this.actionError.set('');
    try {
      if (action.kind === 'delete') {
        await this.gateway.deleteAddon(action.addon, this.typedName());
        this.drafts.update((rows) => rows.filter((row) => row.id !== action.addon.id));
        this.actionSuccess.set(
          'Addon eliminado definitivamente. El historial administrativo se conserva.',
        );
      } else {
        await this.gateway.editorialAction({
          addonId: action.addon.id,
          entity: 'addon',
          id: action.addon.id,
          expected: action.addon.updated_at,
          action: 'withdraw',
          note: 'Despublicado desde el acceso rápido del área de gestión.',
        });
        this.actionSuccess.set('Addon despublicado. Ya no aparece en el catálogo.');
      }
    } catch (error) {
      this.actionError.set(
        error instanceof Error
          ? error.message
          : 'No se completó la operación. Actualiza el listado antes de repetir.',
      );
    } finally {
      this.action.set(null);
      this.typedName.set('');
      this.busy.set(false);
      await this.loadDrafts();
    }
  }
  async verifyStorage(): Promise<void> {
    if (this.testing()) {
      return;
    }
    this.testing.set(true);
    this.results.set([]);
    try {
      this.results.set(await this.gateway.verifyStorage());
    } catch (error) {
      this.results.set([error instanceof Error ? error.message : 'No se completó la prueba.']);
    } finally {
      this.testing.set(false);
    }
  }
  async logout(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.access.signOut();
    } finally {
      this.busy.set(false);
      await this.router.navigateByUrl('/administracion/acceso');
    }
  }
  async verifyPublication(): Promise<void> {
    if (this.testing()) {
      return;
    }
    this.testing.set(true);
    this.results.set([]);
    try {
      this.results.set(await this.gateway.verifyPublication());
    } catch (error) {
      this.results.set([error instanceof Error ? error.message : 'No se completó la prueba.']);
    } finally {
      this.testing.set(false);
    }
  }
}
