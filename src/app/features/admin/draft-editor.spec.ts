import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { DraftConflictError, type DraftBundle } from '../../core/catalog/admin-drafts';
import { DraftEditor } from './draft-editor';
import { Meta } from '@angular/platform-browser';

const id = '11111111-1111-4111-8111-111111111111';
const bundle: DraftBundle = {
  addon: { id, slug: 'prueba', name: 'Prueba', category_id: id, summary: 'Resumen', description: 'Descripción',
    author_name: 'Autor', license_name: 'Pendiente', credits: '', installation_instructions: '', status: 'draft',
    distribution_approved: false, published_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  categories: [{ id, slug: 'categoria', name: 'Categoría', is_visible: true, sort_order: 0, created_at: '', updated_at: '' }],
  releases: [],
};

describe('Draft editor', () => {
  const gateway = { loadDraft: vi.fn(), saveDraft: vi.fn(), saveDraftRelease: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    gateway.loadDraft.mockResolvedValue(structuredClone(bundle));
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      { provide: SupabaseAdminGateway, useValue: gateway }] });
  });
  it('does not write on opening and keeps a clean saved draft separate from publication', async () => {
    const fixture = TestBed.createComponent(DraftEditor); await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(gateway.saveDraft).not.toHaveBeenCalled();
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow');
    page.form.controls.name.setValue('Nombre editado'); page.form.markAsDirty();
    gateway.saveDraft.mockResolvedValue({ ...bundle.addon, name: 'Nombre editado', updated_at: '2026-01-02T00:00:00Z' });
    await page.save();
    expect(page.form.pristine).toBe(true);
    expect(page.success()).toContain('No se ha publicado');
    const input = gateway.saveDraft.mock.calls[0]![2];
    expect(input).not.toHaveProperty('status'); expect(input).not.toHaveProperty('distribution_approved');
    fixture.destroy();
    expect(TestBed.inject(Meta).getTag('name="robots"')).toBeNull();
  });
  it('keeps unsaved text and blocks overwrites after a conflict', async () => {
    const fixture = TestBed.createComponent(DraftEditor); await fixture.whenStable();
    const page = fixture.componentInstance;
    page.form.controls.description.setValue('Mis cambios pendientes'); page.form.markAsDirty();
    gateway.saveDraft.mockRejectedValue(new DraftConflictError());
    await page.save();
    expect(page.form.controls.description.value).toBe('Mis cambios pendientes');
    expect(page.dirty).toBe(true); expect(page.conflict()).toBe(true);
    await page.save(); expect(gateway.saveDraft).toHaveBeenCalledOnce();
  });
  it('validates required fields and warns before leaving unsaved changes', async () => {
    const fixture = TestBed.createComponent(DraftEditor); await fixture.whenStable();
    const page = fixture.componentInstance;
    page.form.controls.name.setValue(''); page.form.markAsDirty();
    await page.save(); expect(gateway.saveDraft).not.toHaveBeenCalled();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(page.canLeave()).toBe(false);
    confirm.mockReturnValue(true); expect(page.canLeave()).toBe(true); confirm.mockRestore();
  });
});
