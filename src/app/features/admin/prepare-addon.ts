import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import type { EditorialBundle } from '../../core/catalog/admin-editorial';
import { releaseFields } from '../../core/catalog/admin-drafts';
import { zipVersion } from '../../core/catalog/guided-publication';
import { validateImageFile, ZIP_LIMIT } from '../../core/catalog/asset-validation';
import { PageSeo } from '../../core/seo/page-seo';

@Component({
  selector: 'app-prepare-addon',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './prepare-addon.html',
  styleUrls: ['./draft-editor.scss', './prepare-addon.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrepareAddon {
  private readonly gateway = inject(SupabaseAdminGateway);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly zipInput = viewChild<ElementRef<HTMLInputElement>>('zipFile');
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageFile');
  readonly bundle = signal<EditorialBundle | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly blocked = signal(false);
  readonly error = signal('');
  readonly progress = signal('');
  readonly success = signal('');
  readonly zip = signal<File | null>(null);
  readonly image = signal<File | null>(null);
  readonly selected = signal('');
  readonly reading = signal(false);
  readonly confirmed = signal(false);
  readonly includeImages = signal(true);
  readonly metadataRead = signal(false);
  readonly form = this.fb.group({
    version: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/)]],
    game_version: ['WoW Forever', [Validators.required, Validators.maxLength(40)]],
    interface_version: [
      0,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(2147483647),
        Validators.pattern(/^\d+$/),
      ],
    ],
    changelog: ['', Validators.maxLength(30000)],
    alt: ['', Validators.maxLength(300)],
  });
  constructor() {
    inject(PageSeo).update({
      title: 'Preparar y publicar | WoW Forever Addons',
      description: 'Añade el ZIP y publica tu addon gratuito.',
      noindex: true,
    });
    void this.load();
  }
  release() {
    return this.bundle()?.releases.find((r) => r.id === this.selected());
  }
  get dirty() {
    return !!this.zip() || !!this.image() || this.form.dirty;
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(e: BeforeUnloadEvent) {
    if (this.busy() || this.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
  canLeave() {
    return (
      !this.busy() &&
      (!this.dirty || window.confirm('Hay archivos o datos sin guardar. ¿Quieres salir?'))
    );
  }
  async load() {
    if (this.busy()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const b = await this.gateway.loadEditorial(this.id);
      this.bundle.set(b);
      this.selected.set(
        b.releases.find((r) => r.status === 'draft')?.id ??
          b.releases.find((r) => r.status === 'published')?.id ??
          '',
      );
      this.zip.set(null);
      this.image.set(null);
      if (this.zipInput()) this.zipInput()!.nativeElement.value = '';
      if (this.imageInput()) this.imageInput()!.nativeElement.value = '';
      this.form.markAsPristine();
      this.blocked.set(false);
      this.confirmed.set(false);
    } catch {
      this.error.set('No se pudo cargar el addon. Comprueba tu sesión y vuelve a intentarlo.');
    } finally {
      this.loading.set(false);
    }
  }
  async chooseZip(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.zip.set(null);
    this.error.set('');
    this.metadataRead.set(false);
    if (!file) return;
    this.reading.set(true);
    try {
      if (file.size > ZIP_LIMIT) throw new Error('El ZIP supera 50 MiB.');
      const metadata = zipVersion(new Uint8Array(await file.arrayBuffer()), file.name);
      this.zip.set(file);
      if (metadata) {
        this.form.patchValue({
          version: metadata.version,
          interface_version: metadata.interfaceVersion,
        });
        this.metadataRead.set(true);
      }
      this.form.markAsDirty();
    } catch (error) {
      if (this.zipInput()) this.zipInput()!.nativeElement.value = '';
      this.error.set(error instanceof Error ? error.message : 'No se pudo leer el ZIP.');
    } finally {
      this.reading.set(false);
    }
  }
  chooseImage(event: Event) {
    this.image.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.form.markAsDirty();
  }
  async finish(publish: boolean) {
    if (this.busy() || this.blocked() || this.loading() || this.reading() || !this.bundle()) return;
    this.error.set('');
    this.success.set('');
    if (publish && !this.confirmed()) {
      this.error.set('Confirma el permiso de distribución antes de publicar.');
      return;
    }
    if (publish && !this.bundle()!.category.is_visible) {
      this.error.set('La categoría está oculta. Cámbiala desde Editar ficha antes de publicar.');
      return;
    }
    if (!this.zip() && !this.release()?.file_path) {
      this.error.set('Selecciona el ZIP del addon.');
      return;
    }
    if (this.zip() && this.release()?.file_path) {
      this.error.set(
        'Esta versión ya tiene ZIP. Usa la gestión avanzada para reemplazarlo o crear otra versión.',
      );
      return;
    }
    if (this.zip() && this.selected() === '') {
      try {
        releaseFields(this.form.getRawValue());
      } catch {
        this.error.set('Revisa versión, cliente e interfaz en Detalles de la versión.');
        return;
      }
    }
    if (this.image() && !this.form.controls.alt.value.trim()) {
      this.error.set('Describe la imagen para las personas que no pueden verla.');
      return;
    }
    this.busy.set(true);
    try {
      if (this.image()) await validateImageFile(this.image()!);
      if (this.zip()) {
        let r = this.release();
        if (!r) {
          this.progress.set('Preparando la versión…');
          r = await this.gateway.createDraftRelease(
            this.id,
            releaseFields(this.form.getRawValue()),
          );
          this.selected.set(r.id);
          this.bundle.update((b) => (b ? { ...b, releases: [...b.releases, r!] } : b));
        }
        this.progress.set('Subiendo y comprobando el ZIP…');
        await this.gateway.uploadDraftZip(this.id, r.id, r.updated_at, this.zip()!);
        this.zip.set(null);
        if (this.zipInput()) this.zipInput()!.nativeElement.value = '';
      }
      if (this.image()) {
        this.progress.set('Subiendo la imagen…');
        await this.gateway.uploadDraftImage(
          this.id,
          this.image()!,
          this.form.controls.alt.value.trim(),
          0,
        );
        this.image.set(null);
        if (this.imageInput()) this.imageInput()!.nativeElement.value = '';
      }
      const b = await this.gateway.loadEditorial(this.id);
      this.bundle.set(b);
      this.form.markAsPristine();
      if (publish) {
        this.progress.set('Publicando el addon…');
        await this.gateway.publishPreparedAddon(
          this.id,
          this.selected(),
          b.addon.updated_at,
          this.includeImages(),
          this.confirmed(),
        );
        this.bundle.set(await this.gateway.loadEditorial(this.id));
        this.success.set('Tu addon ya está publicado y disponible en la web.');
      } else {
        this.success.set(
          'Contenido guardado en borrador. Puedes publicarlo cuando quieras desde aquí.',
        );
      }
    } catch (error) {
      this.blocked.set(true);
      this.error.set(
        (error instanceof Error ? error.message : 'No se completó la operación.') +
          ' Comprueba el estado antes de continuar; no se repite ninguna operación automáticamente.',
      );
    } finally {
      this.busy.set(false);
      this.progress.set('');
    }
  }
}
