import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { DraftConflictError } from '../../core/catalog/admin-drafts';
import { Editorial } from './editorial';
import type { EditorialBundle } from '../../core/catalog/admin-editorial';

const id = '11111111-1111-4111-8111-111111111111';
const bundle: EditorialBundle = {
  addon: {
    id,
    slug: 'test',
    name: 'Test',
    summary: 'Resumen',
    description: '',
    category_id: id,
    author_name: 'Autor',
    license_name: 'MIT',
    credits: '',
    installation_instructions: '',
    status: 'draft',
    distribution_approved: false,
    published_at: null,
    created_at: '',
    updated_at: 'original',
  },
  category: { id, slug: 'test', name: 'Test', is_visible: true, sort_order: 0, created_at: '', updated_at: '' },
  releases: [],
  images: [
    {
      id,
      addon_id: id,
      file_path: `${id}/${id}.png`,
      alt_text: 'Original',
      sort_order: 0,
      is_published: false,
      created_at: '',
      updated_at: 'image-original',
    },
  ],
  events: [],
};
describe('Editorial review and explicit confirmation', () => {
  const gateway = { loadEditorial: vi.fn(), editorialAction: vi.fn(), editorialImageBlob: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    gateway.loadEditorial.mockResolvedValue(structuredClone(bundle));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
        { provide: SupabaseAdminGateway, useValue: gateway },
      ],
    });
  });
  it('requires a reviewed confirmation and a meaningful note, and cancel never writes', async () => {
    const fixture = TestBed.createComponent(Editorial);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    expect(gateway.editorialAction).not.toHaveBeenCalled();
    page.begin('addon', bundle.addon, 'approve', 'Aprobar');
    await page.confirm();
    expect(gateway.editorialAction).not.toHaveBeenCalled();
    expect(page.dirty).toBe(true);
    page.confirmForm.setValue({ note: 'Revisión de derechos realizada', reviewed: false });
    await page.confirm();
    expect(gateway.editorialAction).not.toHaveBeenCalled();
    page.cancel();
    expect(page.dirty).toBe(false);
    page.begin('addon', bundle.addon, 'approve', 'Aprobar');
    page.confirmForm.setValue({ note: 'Revisión de derechos realizada', reviewed: true });
    await page.confirm();
    expect(gateway.editorialAction).toHaveBeenCalledWith({
      addonId: id,
      entity: 'addon',
      id,
      expected: 'original',
      action: 'approve',
      note: 'Revisión de derechos realizada',
    });
    expect(page.success()).toContain('registrado');
    expect(page.dirty).toBe(false);
  });
  it('preserves the review and blocks repeated writes after a conflict or uncertain response', async () => {
    const fixture = TestBed.createComponent(Editorial);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    gateway.editorialAction.mockRejectedValue(new DraftConflictError());
    page.begin('addon', bundle.addon, 'approve', 'Aprobar');
    page.confirmForm.setValue({ note: 'Revisión de derechos realizada', reviewed: true });
    await page.confirm();
    expect(page.conflict()).toBe(true);
    expect(page.confirmForm.getRawValue().note).toContain('derechos');
    expect(page.pending()).not.toBeNull();
    await page.confirm();
    expect(gateway.editorialAction).toHaveBeenCalledOnce();
    expect(page.success()).toBe('');
  });
  it('reviews the exact image fields and timestamp and protects pending edits on navigation', async () => {
    const fixture = TestBed.createComponent(Editorial);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.editImage(bundle.images[0]);
    page.imageForm.setValue({ alt: 'Vista del mapa', order: 2 });
    page.imageForm.markAsDirty();
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(page.canLeave()).toBe(false);
    expect(confirmation).toHaveBeenCalled();
    page.begin('image', bundle.images[0], 'edit', 'Guardar imagen');
    expect(page.pending()?.command).toMatchObject({
      alt: 'Vista del mapa',
      order: 2,
      expected: 'image-original',
    });
    page.confirmForm.setValue({ note: 'Texto accesible y orden revisados', reviewed: true });
    await page.confirm();
    expect(gateway.editorialAction).toHaveBeenCalledWith(
      expect.objectContaining({ alt: 'Vista del mapa', order: 2, entity: 'image', action: 'edit' }),
    );
    expect(page.canLeave()).toBe(true);
    confirmation.mockRestore();
  });
  it('never claims a failed refresh means a failed mutation, and prevents leaving in flight', async () => {
    const fixture = TestBed.createComponent(Editorial);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    gateway.loadEditorial.mockRejectedValue(new Error('network'));
    page.begin('addon', bundle.addon, 'approve', 'Aprobar');
    page.confirmForm.setValue({ note: 'Revisión de derechos realizada', reviewed: true });
    const pending = page.confirm();
    expect(page.canLeave()).toBe(false);
    await pending;
    expect(page.success()).toContain('Cambio confirmado');
    expect(page.bundle()).toBeNull();
    expect(page.pending()).toBeNull();
  });
});
