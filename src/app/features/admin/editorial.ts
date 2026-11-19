import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal,
  afterNextRender,
  Injector,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { DraftConflictError } from '../../core/catalog/admin-drafts';
import type {
  EditorialBundle,
  EditorialCommand,
  EditorialAction,
  EditorialEntity,
} from '../../core/catalog/admin-editorial';
import type { Tables, Json } from '../../core/supabase/database.types';

@Component({
  selector: 'app-editorial',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './editorial.html',
  styleUrls: ['./draft-editor.scss', './editorial.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Editorial {
  private readonly injector = inject(Injector);
  private readonly gateway = inject(SupabaseAdminGateway);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  readonly bundle = signal<EditorialBundle | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly conflict = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly previews = signal<Record<string, string>>({});
  readonly selectedImage = signal<Tables<'addon_images'> | null>(null);
  readonly pending = signal<{ command: Omit<EditorialCommand, 'note'>; label: string } | null>(
    null,
  );
  readonly confirmForm = this.fb.group({
    note: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(1000)]],
    reviewed: [false, Validators.requiredTrue],
  });
  readonly imageForm = this.fb.group({
    alt: ['', [Validators.required, Validators.maxLength(300)]],
    order: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(2147483647),
        Validators.pattern(/^\d+$/),
      ],
    ],
  });
  constructor() {
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => {
      meta.removeTag('name="robots"');
      this.clearPreviews();
    });
    void this.load();
  }
  get dirty(): boolean {
    return this.busy() || this.pending() !== null || this.imageForm.dirty;
  }
  canLeave(): boolean {
    return (
      !this.busy() &&
      (!this.dirty ||
        window.confirm('Hay una revisión o edición sin confirmar. ¿Salir y descartarla?'))
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  private clearPreviews(): void {
    Object.values(this.previews()).forEach((url) => URL.revokeObjectURL(url));
    this.previews.set({});
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.bundle.set(await this.gateway.loadEditorial(this.id));
      this.conflict.set(false);
      this.selectedImage.set(null);
      this.imageForm.reset();
      this.clearPreviews();
    } catch {
      this.bundle.set(null);
      this.error.set('No se pudo cargar la revisión. Comprueba tu sesión y vuelve a intentarlo.');
    } finally {
      this.loading.set(false);
    }
  }
  async reload(): Promise<void> {
    if (
      this.busy() ||
      (this.dirty && !window.confirm('¿Descartar los cambios pendientes y recargar?'))
    ) {
      return;
    }
    this.pending.set(null);
    this.imageForm.reset();
    this.success.set('');
    await this.load();
  }
  status(value: string): string {
    return (
      (
        { draft: 'Borrador', published: 'Publicado', archived: 'Retirado' } as Record<
          string,
          string
        >
      )[value] ?? value
    );
  }
  eventStatus(value: Json | null): string {
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof value['status'] === 'string'
      ? this.status(value['status'])
      : '—';
  }
  entityName(value: string): string {
    return (
      (
        { addons: 'Ficha', addon_releases: 'Versión', addon_images: 'Imagen' } as Record<
          string,
          string
        >
      )[value] ?? value
    );
  }
  operationName(value: string): string {
    return (
      ({ INSERT: 'Creación', UPDATE: 'Edición', DELETE: 'Eliminación' } as Record<string, string>)[
        value
      ] ?? value
    );
  }
  eventDetail(value: Json | null): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return 'Sin registro';
    }
    const parts: string[] = [];
    if (typeof value['status'] === 'string') {
      parts.push(this.status(value['status']));
    }
    if (typeof value['distribution_approved'] === 'boolean') {
      parts.push(
        value['distribution_approved'] ? 'Distribución aprobada' : 'Distribución pendiente',
      );
    }
    if (typeof value['version'] === 'string') {
      parts.push('Versión ' + value['version']);
    }
    if (typeof value['is_published'] === 'boolean') {
      parts.push(value['is_published'] ? 'Imagen publicada' : 'Imagen oculta');
    }
    if (typeof value['alt_text'] === 'string') {
      parts.push(value['alt_text']);
    }
    if (typeof value['sort_order'] === 'number') {
      parts.push('Orden ' + value['sort_order']);
    }
    return parts.join(' · ') || 'Contenido registrado';
  }
  begin(
    entity: EditorialEntity,
    row: { id: string; updated_at: string },
    action: EditorialAction,
    label: string,
  ): void {
    if (this.busy() || this.conflict() || this.pending()) {
      return;
    }
    if (this.imageForm.dirty && action !== 'edit') {
      this.error.set('Guarda o cancela primero la edición de la imagen.');
      return;
    }
    const command: Omit<EditorialCommand, 'note'> = {
      addonId: this.id,
      entity,
      id: row.id,
      expected: row.updated_at,
      action,
    };
    if (action === 'edit') {
      this.imageForm.markAllAsTouched();
      if (this.imageForm.invalid) {
        this.error.set('Revisa el texto alternativo y el orden entero.');
        return;
      }
      command.alt = this.imageForm.getRawValue().alt;
      command.order = this.imageForm.getRawValue().order;
    }
    this.error.set('');
    this.success.set('');
    this.confirmForm.reset();
    this.pending.set({ command, label });
    // Move keyboard users to the review without submitting the operation.
    afterNextRender(() => document.getElementById('editorial-review')?.focus(), { injector: this.injector });
  }
  cancel(): void {
    if (!this.busy()) {
      this.pending.set(null);
      this.confirmForm.reset();
    }
  }
  editImage(image: Tables<'addon_images'>): void {
    if (
      this.busy() ||
      this.pending() ||
      (this.imageForm.dirty && !window.confirm('¿Descartar la edición de imagen pendiente?'))
    ) {
      return;
    }
    this.selectedImage.set(image);
    this.imageForm.reset({ alt: image.alt_text, order: image.sort_order });
  }
  cancelImage(): void {
    if (!this.busy() && !this.pending()) {
      this.selectedImage.set(null);
      this.imageForm.reset();
    }
  }
  async confirm(): Promise<void> {
    const pending = this.pending();
    if (!pending || this.busy() || this.conflict()) {
      return;
    }
    this.confirmForm.markAllAsTouched();
    if (this.confirmForm.invalid) {
      this.error.set('Escribe el motivo y confirma que has revisado el cambio.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.gateway.editorialAction({
        ...pending.command,
        note: this.confirmForm.getRawValue().note,
      });
      this.pending.set(null);
      this.confirmForm.reset();
      this.imageForm.reset();
      await this.load();
      this.success.set(
        this.bundle()
          ? 'Cambio guardado y registrado en el historial.'
          : 'Cambio confirmado. Recarga para comprobar el estado actual.',
      );
    } catch (error) {
      if (error instanceof DraftConflictError) {
        this.conflict.set(true);
        this.error.set(
          'El contenido ha cambiado. No se aplicó esta operación. Recarga y vuelve a revisarlo.',
        );
      } else {
        this.conflict.set(true);
        this.error.set(
          error instanceof Error
            ? error.message
            : 'No se confirmó el cambio. Recarga antes de reintentar.',
        );
      }
    } finally {
      this.busy.set(false);
    }
  }
  async showImage(id: string): Promise<void> {
    if (this.busy() || this.previews()[id]) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const blob = await this.gateway.editorialImageBlob(this.id, id);
      this.previews.update((urls) => ({ ...urls, [id]: URL.createObjectURL(blob) }));
    } catch {
      this.error.set('No se pudo cargar la vista previa privada.');
    } finally {
      this.busy.set(false);
    }
  }
}
