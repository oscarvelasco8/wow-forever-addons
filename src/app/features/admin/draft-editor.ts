import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { DraftConflictError, DraftValidationError, draftFields, releaseFields, type DraftBundle, type DraftRelease } from '../../core/catalog/admin-drafts';

@Component({
  selector: 'app-draft-editor', imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './draft-editor.html', styleUrl: './draft-editor.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraftEditor {
  private readonly gateway = inject(SupabaseAdminGateway);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly fb = inject(NonNullableFormBuilder);
  readonly bundle = signal<DraftBundle | null>(null);
  readonly selectedRelease = signal<DraftRelease | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly preview = signal(false);
  readonly conflict = signal(false);
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)]],
    category_id: ['', Validators.required], summary: ['', [Validators.required, Validators.maxLength(300)]],
    description: ['', Validators.maxLength(30000)], author_name: ['', [Validators.required, Validators.maxLength(150)]],
    license_name: ['', [Validators.required, Validators.maxLength(150)]], credits: ['', Validators.maxLength(30000)],
    installation_instructions: ['', Validators.maxLength(30000)],
  });
  readonly releaseForm = this.fb.group({
    version: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/)]],
    game_version: ['', [Validators.required, Validators.maxLength(40)]],
    interface_version: [1, [Validators.required, Validators.min(1), Validators.max(2147483647), Validators.pattern(/^\d+$/)]],
    changelog: ['', Validators.maxLength(30000)],
  });
  constructor() {
    const meta = inject(Meta); meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
    void this.load();
  }
  get dirty(): boolean { return this.form.dirty || this.releaseForm.dirty; }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) { if (this.dirty || this.saving()) { event.preventDefault(); event.returnValue = ''; } }
  canLeave(): boolean { return !this.saving() && (!this.dirty || window.confirm('Hay cambios sin guardar. ¿Quieres salir y descartarlos?')); }
  async load(): Promise<void> {
    if (this.saving() || (!this.loading() && this.dirty && !window.confirm('Se descartarán los cambios sin guardar al recargar. ¿Continuar?'))) { return; }
    this.loading.set(true); this.bundle.set(null); this.error.set(''); this.success.set(''); this.conflict.set(false);
    try {
      const bundle = await this.gateway.loadDraft(this.id);
      this.bundle.set(bundle); this.form.reset(draftFields(bundle.addon));
      this.chooseRelease(bundle.releases[0]?.id ?? '', true);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el borrador.'); }
    finally { this.loading.set(false); }
  }
  chooseRelease(id: string, force = false): void {
    if (!force && this.releaseForm.dirty && !window.confirm('Se descartarán los cambios de esta versión. ¿Continuar?')) { return; }
    const release = this.bundle()?.releases.find(item => item.id === id) ?? null;
    this.selectedRelease.set(release);
    if (release) { this.releaseForm.reset(releaseFields(release)); }
    else { this.releaseForm.reset(); }
  }
  private report(error: unknown): void {
    if (error instanceof DraftConflictError) {
      this.conflict.set(true);
      this.error.set('El borrador cambió en otra sesión, dejó de ser editable o ya no tienes acceso. Tus cambios siguen en el formulario. Recarga antes de guardar de nuevo.');
    } else if (error instanceof DraftValidationError) { this.error.set('Revisa los campos obligatorios y sus límites.'); }
    else { this.error.set(error instanceof Error ? error.message : 'No se guardaron los cambios.'); }
  }
  async save(): Promise<void> {
    const bundle = this.bundle();
    if (!bundle || this.saving() || this.conflict()) { return; }
    this.error.set(''); this.success.set(''); this.form.markAllAsTouched();
    if (this.form.invalid) { this.error.set('Revisa los campos obligatorios y sus límites.'); return; }
    this.saving.set(true); this.form.disable({ emitEvent: false });
    try {
      const addon = await this.gateway.saveDraft(bundle.addon.id, bundle.addon.updated_at, this.form.getRawValue());
      this.bundle.set({ ...bundle, addon }); this.form.reset(draftFields(addon));
      this.success.set('Ficha guardada como borrador. No se ha publicado.');
    } catch (error) { this.report(error); }
    finally { this.form.enable({ emitEvent: false }); this.saving.set(false); }
  }
  async saveRelease(): Promise<void> {
    const bundle = this.bundle(), release = this.selectedRelease();
    if (!bundle || !release || this.saving() || this.conflict()) { return; }
    this.error.set(''); this.success.set(''); this.releaseForm.markAllAsTouched();
    if (this.releaseForm.invalid) { this.error.set('Revisa la versión, el cliente y el número entero de interfaz.'); return; }
    this.saving.set(true); this.releaseForm.disable({ emitEvent: false });
    try {
      const saved = await this.gateway.saveDraftRelease(bundle.addon.id, release.id, release.updated_at, this.releaseForm.getRawValue());
      this.selectedRelease.set(saved); this.releaseForm.reset(releaseFields(saved));
      this.bundle.set({ ...bundle, releases: bundle.releases.map(item => item.id === saved.id ? saved : item) });
      this.success.set('Versión guardada como borrador. No se ha publicado.');
    } catch (error) { this.report(error); }
    finally { this.releaseForm.enable({ emitEvent: false }); this.saving.set(false); }
  }
}
