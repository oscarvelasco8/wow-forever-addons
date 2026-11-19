import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, HostListener, Injector, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { DraftConflictError, DraftValidationError, type DraftBundle } from '../../core/catalog/admin-drafts';
import type { DraftImage } from '../../core/catalog/admin-assets';
import type { AssetTarget } from '../../core/catalog/asset-changes';

@Component({ selector: 'app-draft-assets', imports: [RouterLink, ReactiveFormsModule], templateUrl: './draft-assets.html',
  styleUrl: './draft-editor.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class DraftAssets {
  private readonly gateway = inject(SupabaseAdminGateway);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly injector=inject(Injector);private readonly document=inject(DOCUMENT);private returnFocus:HTMLElement|null=null;
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  readonly bundle = signal<DraftBundle | null>(null);
  readonly images = signal<DraftImage[]>([]);
  readonly previewUrls = signal<Record<string, string>>({});
  readonly loading = signal(true); readonly busy = signal(false);
  readonly error = signal(''); readonly success = signal('');
  readonly selectedId = signal(''); readonly zip = signal<File | null>(null); readonly image = signal<File | null>(null);
  readonly review=signal<AssetTarget|null>(null);readonly replacing=signal(false);readonly replacement=signal<File|null>(null);
  readonly note=signal('');readonly confirmed=signal(false);readonly blocked=signal(false);
  readonly pendingCleanup=signal<{id:string;bucket:string;path:string}|null>(null);
  readonly managementReady=signal(false);
  readonly versionForm = this.fb.group({
    version: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/)]],
    game_version: ['', [Validators.required, Validators.maxLength(40)]],
    interface_version: [1, [Validators.required, Validators.min(1), Validators.max(2147483647), Validators.pattern(/^\d+$/)]],
    changelog: ['', Validators.maxLength(30000)],
  });
  readonly imageForm = this.fb.group({ alt: ['', [Validators.required, Validators.maxLength(300)]],
    order: [0, [Validators.required, Validators.min(0), Validators.max(2147483647), Validators.pattern(/^\d+$/)]] });
  constructor() {
    const meta = inject(Meta); meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => {
      meta.removeTag('name="robots"'); for (const url of Object.values(this.previewUrls())) { URL.revokeObjectURL(url); }
    });
    void this.load();
  }
  get dirty(): boolean { return !!this.review() || !!this.pendingCleanup() || !!this.zip() || !!this.image() || this.versionForm.dirty || this.imageForm.dirty; }
  get release() { return this.bundle()?.releases.find(item => item.id === this.selectedId()); }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) { if (this.dirty || this.busy()) { event.preventDefault(); event.returnValue = ''; } }
  canLeave(): boolean { return !this.busy() && (!this.dirty || window.confirm('Hay archivos seleccionados o datos sin guardar. ¿Salir y descartarlos?')); }
  async load(): Promise<void> {
    if (this.busy()) { return; }
    this.loading.set(true); this.error.set('');
    try {
      const [bundle, images] = await Promise.all([this.gateway.loadAssetBundle(this.id), this.gateway.loadDraftImages(this.id)]);
      this.bundle.set(bundle); this.images.set(images); this.selectedId.set(bundle.releases[0]?.id ?? '');
      for(const url of Object.values(this.previewUrls()))URL.revokeObjectURL(url);this.previewUrls.set({});
      const status=await this.gateway.draftAssetStatus(this.id);this.managementReady.set(status.ready);
      this.pendingCleanup.set(status.pending[0]??null);
      this.blocked.set(false);this.review.set(null);
    } catch (error) { this.report(error); }
    finally { this.loading.set(false); }
  }
  private report(error: unknown): void {
    this.error.set(error instanceof DraftConflictError ? 'El borrador cambió o ya no es editable. Vuelve a la ficha y recarga antes de continuar.'
      : error instanceof DraftValidationError ? 'Revisa los campos de la versión.' : error instanceof Error ? error.message : 'No se completó la operación.');
  }
  selectZip(event: Event): void { this.zip.set((event.target as HTMLInputElement).files?.[0] ?? null); this.error.set(''); this.success.set(''); }
  selectImage(event: Event): void { this.image.set((event.target as HTMLInputElement).files?.[0] ?? null); this.error.set(''); this.success.set(''); }
  async createVersion(): Promise<void> {
    if (this.busy() || this.blocked() || this.review() || this.pendingCleanup() || !this.bundle()) { return; }
    this.error.set(''); this.success.set(''); this.versionForm.markAllAsTouched();
    if (this.versionForm.invalid) { this.error.set('Revisa el número de versión, cliente e interfaz entera.'); return; }
    this.busy.set(true); this.versionForm.disable();
    try {
      const release = await this.gateway.createDraftRelease(this.id, this.versionForm.getRawValue());
      this.bundle.update(bundle => bundle ? { ...bundle, releases: [release, ...bundle.releases] } : null);
      this.selectedId.set(release.id); this.versionForm.reset();
      this.success.set('Versión creada en borrador. Ya puedes seleccionar su ZIP.');
    } catch (error) { this.report(error); }
    finally { this.versionForm.enable(); this.busy.set(false); }
  }
  async uploadZip(input: HTMLInputElement): Promise<void> {
    const file = this.zip(), release = this.release;
    if (this.busy() || !this.managementReady() || this.blocked() || this.review() || this.pendingCleanup() || !file || !release || release.file_path) { return; }
    this.error.set(''); this.success.set(''); this.busy.set(true);
    try {
      const saved = await this.gateway.uploadDraftZip(this.id, release.id, release.updated_at, file);
      this.bundle.update(bundle => bundle ? { ...bundle, releases: bundle.releases.map(item => item.id === saved.id ? saved : item) } : null);
      this.zip.set(null); input.value = ''; this.success.set('ZIP subido y asociado a la versión en borrador. No se ha publicado.');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  async uploadImage(input: HTMLInputElement): Promise<void> {
    const file = this.image();
    if (this.busy() || !this.managementReady() || this.blocked() || this.review() || this.pendingCleanup() || !file) { return; }
    this.imageForm.markAllAsTouched(); this.error.set(''); this.success.set('');
    if (this.imageForm.invalid) { this.error.set('Añade un texto alternativo y un orden entero válido.'); return; }
    this.busy.set(true); this.imageForm.disable();
    try {
      const data = this.imageForm.getRawValue();
      const saved = await this.gateway.uploadDraftImage(this.id, file, data.alt, data.order);
      this.images.update(images => [...images, saved].sort((a,b) => a.sort_order - b.sort_order));
      this.image.set(null); input.value = ''; this.imageForm.reset(); this.success.set('Imagen guardada en borrador. No se ha publicado.');
    } catch (error) { this.report(error); }
    finally { this.imageForm.enable(); this.busy.set(false); }
  }
  async showImage(id: string): Promise<void> {
    if (this.busy() || this.previewUrls()[id]) { return; }
    this.busy.set(true); this.error.set('');
    try {
      const blob = await this.gateway.draftImageBlob(this.id, id);
      this.previewUrls.update(urls => ({ ...urls, [id]: URL.createObjectURL(blob) }));
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  beginChange(target:AssetTarget,replacing:boolean):void{
    if(this.busy()||this.blocked()||this.pendingCleanup()||!this.managementReady())return;
    if(target.kind==='release'?(target.row.status!=='draft'||!!target.row.published_at):target.row.is_published){this.error.set('Un archivo publicado está protegido.');return;}
    this.review.set(target);this.replacing.set(replacing);this.replacement.set(null);this.note.set('');this.confirmed.set(false);this.error.set('');this.success.set('');
    this.returnFocus=this.document.activeElement as HTMLElement|null;
    afterNextRender(()=>this.document.getElementById('asset-review-title')?.focus(),{injector:this.injector});
  }
  cancelChange():void{if(!this.busy()){this.review.set(null);this.replacement.set(null);this.note.set('');this.confirmed.set(false);afterNextRender(()=>this.returnFocus?.focus(),{injector:this.injector});}}
  async confirmChange():Promise<void>{
    const target=this.review();if(this.busy()||this.blocked()||!target||!this.confirmed()||this.note().trim().length<12||this.note().length>1000||(this.replacing()&&!this.replacement()))return;
    this.busy.set(true);this.error.set('');this.success.set('');
    try{
      const result=await this.gateway.changeDraftAsset(target,this.note(),this.replacing()?this.replacement():null);
      if(target.kind==='release'){this.bundle.update(b=>b?{...b,releases:b.releases.map(r=>r.id===target.row.id?result.saved as typeof r:r)}:b);}
      else{this.images.update(rows=>result.saved?rows.map(i=>i.id===target.row.id?result.saved as DraftImage:i):rows.filter(i=>i.id!==target.row.id));
        const url=this.previewUrls()[target.row.id];if(url)URL.revokeObjectURL(url);this.previewUrls.update(urls=>{const copy={...urls};delete copy[target.row.id];return copy;});}
      this.success.set(this.replacing()?'Reemplazo guardado. Esta operación no cambia la publicación.':target.kind==='release'?'ZIP retirado del borrador. No se ha eliminado la versión.':'Imagen retirada del borrador.');
      if(result.cleanupPending)this.pendingCleanup.set({id:target.row.id,bucket:target.kind==='release'?'addon-files':'addon-images',path:result.oldPath});
      this.review.set(null);this.replacement.set(null);
    }catch(error){this.report(error);this.blocked.set(true);}
    finally{this.busy.set(false);}
  }
  async retryCleanup():Promise<void>{
    const pending=this.pendingCleanup();if(!pending||this.busy())return;
    this.busy.set(true);this.error.set('');try{await this.gateway.cleanupRetiredAsset(this.id,pending.id,pending.bucket,pending.path);const status=await this.gateway.draftAssetStatus(this.id);this.managementReady.set(status.ready);this.pendingCleanup.set(status.pending[0]??null);this.success.set('Limpieza comprobada: el archivo anterior ya no está en Storage.');}catch(error){this.report(error);}finally{this.busy.set(false);}
  }
}
