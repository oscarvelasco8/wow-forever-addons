import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  HostListener,
  inject,
  signal,
  Injector,
  afterNextRender,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import {
  categoryFields,
  type Category,
  type CategoryBundle,
  type CategoryInput,
} from '../../core/catalog/admin-categories';
import { DraftConflictError } from '../../core/catalog/admin-drafts';

@Component({
  selector: 'app-admin-categories',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './categories.html',
  styleUrls: ['./draft-editor.scss', './editorial.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCategories {
  private readonly gateway = inject(SupabaseAdminGateway);
  private readonly injector = inject(Injector);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly bundle = signal<CategoryBundle | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly conflict = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editorOpen = signal(false);
  readonly selected = signal<Category | null>(null);
  readonly pending = signal<CategoryInput | null>(null);
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    slug: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/),
      ],
    ],
    order: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(2147483647),
        Validators.pattern(/^\d+$/),
      ],
    ],
    visible: [false],
  });
  readonly review = this.fb.group({
    note: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(1000)]],
    confirmed: [false, Validators.requiredTrue],
  });
  constructor() {
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
    void this.load();
  }
  get dirty(): boolean {
    return this.busy() || !!this.pending() || (this.editorOpen() && this.form.dirty);
  }
  canLeave(): boolean {
    return (
      !this.busy() &&
      (!this.dirty ||
        window.confirm('Hay cambios de categoría sin guardar. ¿Salir y descartarlos?'))
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  private focus(id: string): void {
    afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.bundle.set(await this.gateway.loadCategories());
      this.conflict.set(false);
    } catch {
      this.bundle.set(null);
      this.error.set('No se pudieron cargar las categorías. Comprueba tu sesión y recarga.');
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
    this.close();
    this.success.set('');
    await this.load();
  }
  edit(category: Category | null): void {
    if (
      this.busy() ||
      this.loading() ||
      this.conflict() ||
      this.pending() ||
      (this.dirty && !window.confirm('¿Descartar la edición pendiente?'))
    ) {
      return;
    }
    this.selected.set(category);
    this.editorOpen.set(true);
    this.conflict.set(false);
    this.error.set('');
    this.success.set('');
    this.form.reset({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      order: category?.sort_order ?? 0,
      visible: category?.is_visible ?? false,
    });
    this.focus('category-editor');
  }
  close(): void {
    if (this.busy()) {
      return;
    }
    this.editorOpen.set(false);
    this.pending.set(null);
    this.selected.set(null);
    this.form.reset();
    this.review.reset();
  }
  prepare(): void {
    if (this.busy() || this.conflict() || this.pending()) {
      return;
    }
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid) {
      this.error.set('Revisa el nombre, identificador y orden entero.');
      return;
    }
    try {
      const c = this.selected();
      this.pending.set(
        categoryFields({ ...this.form.getRawValue(), id: c?.id, expected: c?.updated_at }),
      );
      this.review.reset();
      this.focus('category-review');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Revisa los campos.');
    }
  }
  cancelReview(): void {
    if (!this.busy()) {
      this.pending.set(null);
      this.review.reset();
    }
  }
  async confirm(): Promise<void> {
    const pending = this.pending();
    if (!pending || this.busy() || this.conflict()) {
      return;
    }
    this.review.markAllAsTouched();
    if (this.review.invalid) {
      this.error.set('Escribe un motivo y confirma que has revisado el cambio.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.gateway.saveCategory(pending, this.review.getRawValue().note);
      this.pending.set(null);
      this.editorOpen.set(false);
      this.form.reset();
      this.review.reset();
      await this.load();
      this.success.set(
        this.bundle()
          ? 'Categoría guardada y cambio registrado.'
          : 'Cambio confirmado. Recarga para ver el estado actual.',
      );
    } catch (error) {
      this.conflict.set(true);
      this.error.set(
        error instanceof DraftConflictError
          ? 'La categoría cambió desde que la abriste. No se aplicó esta edición. Recarga para revisarla.'
          : error instanceof Error
            ? error.message
            : 'No se confirmó el cambio. Recarga antes de reintentar.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
