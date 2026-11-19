import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import { DraftConflictError } from '../../core/catalog/admin-drafts';
import { AdminCategories } from './categories';
const category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Exploración',
  slug: 'exploracion',
  sort_order: 2,
  is_visible: true,
  created_at: '',
  updated_at: 'original',
};
describe('Category management review', () => {
  const gateway = { loadCategories: vi.fn(), saveCategory: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    gateway.loadCategories.mockResolvedValue({ categories: [category], events: [] });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SupabaseAdminGateway, useValue: gateway }],
    });
  });
  it('creates only a hidden category, after reviewed explicit confirmation', async () => {
    const fixture = TestBed.createComponent(AdminCategories);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.edit(null);
    page.form.setValue({ name: 'Utilidades', slug: 'utilidades', order: 3, visible: false });
    page.prepare();
    await page.confirm();
    expect(gateway.saveCategory).not.toHaveBeenCalled();
    page.review.setValue({ note: 'Organización revisada para el catálogo', confirmed: true });
    await page.confirm();
    expect(gateway.saveCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Utilidades',
        slug: 'utilidades',
        order: 3,
        visible: false,
        id: undefined,
      }),
      'Organización revisada para el catálogo',
    );
    expect(page.dirty).toBe(false);
    expect(page.success()).toContain('registrado');
  });
  it('preserves conflict contents and blocks new edits until reload', async () => {
    const fixture = TestBed.createComponent(AdminCategories);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.edit(category);
    page.form.controls.visible.setValue(false);
    page.prepare();
    expect(page.pending()).toMatchObject({ id: category.id, expected: 'original', visible: false });
    gateway.saveCategory.mockRejectedValue(new DraftConflictError());
    page.review.setValue({ note: 'Ocultar temporalmente la categoría', confirmed: true });
    await page.confirm();
    expect(page.conflict()).toBe(true);
    expect(page.pending()?.visible).toBe(false);
    page.edit(null);
    expect(page.selected()?.id).toBe(category.id);
    await page.confirm();
    expect(gateway.saveCategory).toHaveBeenCalledOnce();
  });
  it('rejects invalid identifiers and fractional orders, cancels without saving, and protects pending navigation', async () => {
    const fixture = TestBed.createComponent(AdminCategories);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.edit(null);
    page.form.setValue({ name: 'Nombre', slug: 'invalid slug', order: 1.5, visible: false });
    page.prepare();
    expect(page.pending()).toBeNull();
    page.form.setValue({ name: 'Nombre', slug: 'nombre', order: 1, visible: false });
    page.form.markAsDirty();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(page.canLeave()).toBe(false);
    confirm.mockRestore();
    page.prepare();
    page.cancelReview();
    expect(page.form.getRawValue().name).toBe('Nombre');
    page.close();
    expect(gateway.saveCategory).not.toHaveBeenCalled();
    expect(page.canLeave()).toBe(true);
  });
});
