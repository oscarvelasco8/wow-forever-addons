import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { DraftAssets } from './draft-assets';
import type { DraftBundle } from '../../core/catalog/admin-drafts';

const id = '11111111-1111-4111-8111-111111111111';
const bundle: DraftBundle = {
  addon: { id, slug: 'test', name: 'Test', category_id: id, summary: 'Resumen', description: '', author_name: 'Autor',
    license_name: 'Pendiente', credits: '', installation_instructions: '', status: 'draft', distribution_approved: false,
    published_at: null, created_at: '', updated_at: 'timestamp' }, categories: [],
  releases: [{ id, addon_id: id, version: '1', game_version: 'Test', interface_version: 1, changelog: '', status: 'draft',
    file_path: null, file_size_bytes: null, sha256: null, published_at: null, created_at: '', updated_at: 'timestamp' }],
};

describe('Draft asset forms', () => {
  const gateway = { loadAssetBundle: vi.fn(), loadDraftImages: vi.fn(), createDraftRelease: vi.fn(), uploadDraftZip: vi.fn(), uploadDraftImage: vi.fn(),draftAssetStatus:vi.fn(),changeDraftAsset:vi.fn(),cleanupRetiredAsset:vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks(); gateway.loadAssetBundle.mockResolvedValue(structuredClone(bundle)); gateway.loadDraftImages.mockResolvedValue([]);
    gateway.draftAssetStatus.mockResolvedValue({ready:true,pending:[]});
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      { provide: SupabaseAdminGateway, useValue: gateway }] });
  });
  it('creates an empty draft version only after valid explicit submission', async () => {
    const fixture = TestBed.createComponent(DraftAssets); await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(gateway.createDraftRelease).not.toHaveBeenCalled();
    await page.createVersion(); expect(gateway.createDraftRelease).not.toHaveBeenCalled();
    page.versionForm.setValue({ version: '2', game_version: 'Forever', interface_version: 16001, changelog: 'Texto' });
    gateway.createDraftRelease.mockResolvedValue({ ...bundle.releases[0], id: 'new-version', version: '2' });
    await page.createVersion();
    expect(page.selectedId()).toBe('new-version'); expect(page.versionForm.pristine).toBe(true);
    expect(page.success()).toContain('en borrador');
  });
  it('requires review, reason and checkbox and distinguishes a committed change from cleanup',async()=>{
    gateway.loadAssetBundle.mockResolvedValue({...structuredClone(bundle),releases:[{...bundle.releases[0],file_path:`${id}/${id}.zip`}]});
    const fixture=TestBed.createComponent(DraftAssets);await fixture.whenStable();const page=fixture.componentInstance;
    page.beginChange({kind:'release',row:page.release!},false);await page.confirmChange();expect(gateway.changeDraftAsset).not.toHaveBeenCalled();
    page.note.set('Archivo de prueba descartado');page.confirmed.set(true);
    gateway.changeDraftAsset.mockResolvedValue({saved:{...page.release,file_path:null},oldPath:`${id}/${id}.zip`,cleanupPending:true});
    await page.confirmChange();expect(page.release?.file_path).toBeNull();expect(page.pendingCleanup()).toBeTruthy();expect(page.review()).toBeNull();
    gateway.cleanupRetiredAsset.mockResolvedValue(undefined);await page.retryCleanup();expect(page.pendingCleanup()).toBeNull();expect(page.success()).toContain('Limpieza comprobada');
  });
  it('blocks new changes on uncertainty and protects published images',async()=>{
    gateway.loadAssetBundle.mockResolvedValue({...structuredClone(bundle),releases:[{...bundle.releases[0],file_path:`${id}/${id}.zip`}]});
    const fixture=TestBed.createComponent(DraftAssets);await fixture.whenStable();const page=fixture.componentInstance;
    page.beginChange({kind:'release',row:page.release!},false);page.note.set('Archivo de prueba descartado');page.confirmed.set(true);gateway.changeDraftAsset.mockRejectedValue(new Error('Respuesta incierta'));
    await page.confirmChange();expect(page.blocked()).toBe(true);await page.confirmChange();expect(gateway.changeDraftAsset).toHaveBeenCalledOnce();
    await page.load();expect(page.blocked()).toBe(false);
    page.beginChange({kind:'image',row:{id,addon_id:id,file_path:`${id}/${id}.png`,is_published:true,alt_text:'Publicada',sort_order:0,created_at:'',updated_at:'timestamp'}},false);
    expect(page.review()).toBeNull();expect(page.error()).toContain('protegido');
  });
  it('keeps the selected image and alt text after a failed upload', async () => {
    const fixture = TestBed.createComponent(DraftAssets); await fixture.whenStable();
    const page = fixture.componentInstance;
    const file = new File(['test'], 'image.png'); page.image.set(file);
    page.imageForm.controls.alt.setValue('Texto conservado');
    gateway.uploadDraftImage.mockRejectedValue(new Error('No se pudo asociar; subida eliminada.'));
    const input = { value: 'image.png' } as HTMLInputElement;
    await page.uploadImage(input);
    expect(page.image()).toBe(file); expect(page.imageForm.controls.alt.value).toBe('Texto conservado');
    expect(page.dirty).toBe(true); expect(page.success()).toBe(''); expect(page.busy()).toBe(false);
  });
  it('clears a successful ZIP selection and does not offer another upload for the attached version', async () => {
    const fixture = TestBed.createComponent(DraftAssets); await fixture.whenStable();
    const page = fixture.componentInstance; const file = new File(['test'], 'test.zip'); page.zip.set(file);
    const input = { value: 'test.zip' } as HTMLInputElement;
    gateway.uploadDraftZip.mockResolvedValue({ ...bundle.releases[0], file_path: `${id}/${id}.zip`, file_size_bytes: 4, sha256: 'a'.repeat(64) });
    await page.uploadZip(input);
    expect(input.value).toBe(''); expect(page.zip()).toBeNull(); expect(page.release?.file_path).not.toBeNull();
    page.zip.set(file); await page.uploadZip(input); expect(gateway.uploadDraftZip).toHaveBeenCalledOnce();
  });
});
