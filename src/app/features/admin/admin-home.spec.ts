import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminHome } from './admin-home';
import { AdminAccess } from '../../core/auth/admin-access';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import type { DraftAddon } from '../../core/catalog/admin-drafts';
const row: DraftAddon = {
  id: 'a',
  name: 'Prueba',
  slug: 'prueba',
  status: 'draft',
  summary: 'Resumen',
  description: '',
  author_name: 'Autor',
  license_name: 'Pendiente',
  category_id: 'c',
  credits: '',
  installation_instructions: '',
  distribution_approved: false,
  published_at: null,
  created_at: 'stamp',
  updated_at: 'stamp',
};
describe('Quick addon management', () => {
  const gateway = {
    listEditorial: vi.fn(),
    loadDeletionStatus: vi.fn(),
    deleteAddon: vi.fn(),
    editorialAction: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    gateway.listEditorial.mockResolvedValue([structuredClone(row)]);
    gateway.loadDeletionStatus.mockResolvedValue({ ready: true, pending: [] });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupabaseAdminGateway, useValue: gateway },
        { provide: AdminAccess, useValue: { signOut: vi.fn() } },
      ],
    });
  });
  it('offers delete on a draft without doing anything until its name is confirmed', async () => {
    const f = TestBed.createComponent(AdminHome);
    await f.whenStable();
    const p = f.componentInstance;
    expect(f.nativeElement.textContent).toContain('Eliminar addon');
    expect(f.nativeElement.textContent).not.toContain('Despublicar');
    p.openAction('delete', row);
    await p.confirmAction();
    expect(gateway.deleteAddon).not.toHaveBeenCalled();
    p.typedName.set('Prueba');
    gateway.listEditorial.mockResolvedValue([]);
    await p.confirmAction();
    expect(gateway.deleteAddon).toHaveBeenCalledWith(row, 'Prueba');
    expect(p.drafts()).toEqual([]);
  });
  it('offers unpublish on published items and refreshes the list after confirmation', async () => {
    const published = { ...row, status: 'published' } as DraftAddon;
    gateway.listEditorial.mockResolvedValue([published]);
    const f = TestBed.createComponent(AdminHome);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Despublicar');
    const p = f.componentInstance;
    p.openAction('withdraw', published);
    await p.confirmAction();
    expect(gateway.editorialAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'withdraw', expected: 'stamp' }),
    );
    expect(gateway.listEditorial).toHaveBeenCalledTimes(2);
  });
  it('shows resumable cleanup without editing links and does not repeat a failed deletion', async () => {
    gateway.loadDeletionStatus.mockResolvedValue({ ready: true, pending: ['a'] });
    const f = TestBed.createComponent(AdminHome);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Continuar eliminación');
    expect(f.nativeElement.textContent).not.toContain('Preparar y publicar');
    const p = f.componentInstance;
    p.openAction('delete', row);
    p.typedName.set('Prueba');
    gateway.deleteAddon.mockRejectedValue(new Error('Limpieza pendiente'));
    await p.confirmAction();
    await p.confirmAction();
    expect(gateway.deleteAddon).toHaveBeenCalledOnce();
    expect(p.actionError()).toContain('pendiente');
  });
});
