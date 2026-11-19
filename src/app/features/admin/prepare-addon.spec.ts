import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { PrepareAddon } from './prepare-addon';
import { SupabaseAdminGateway } from '../../core/auth/supabase-admin-gateway';
import type { EditorialBundle } from '../../core/catalog/admin-editorial';
const bundle = {
  addon: {
    id: 'a',
    name: 'Prueba',
    slug: 'prueba',
    summary: 'Resumen',
    status: 'draft',
    updated_at: 'stamp',
    author_name: 'Autor',
    category_id: 'c',
    created_at: 'stamp',
    credits: '',
    description: '',
    distribution_approved: false,
    installation_instructions: '',
    license_name: 'Pendiente de revisión',
    published_at: null,
  },
  category: {
    id: 'c',
    name: 'Categoría',
    slug: 'categoria',
    is_visible: true,
    sort_order: 0,
    created_at: 'stamp',
    updated_at: 'stamp',
  },
  releases: [
    {
      id: 'r',
      file_path: 'fixture.zip',
      file_size_bytes: 631,
      status: 'draft',
      updated_at: 'stamp',
      version: '0.0.1',
      addon_id: 'a',
      changelog: '',
      created_at: 'stamp',
      game_version: 'WoW Forever',
      interface_version: 16001,
      published_at: null,
      sha256: 'a'.repeat(64),
    },
  ],
  images: [],
  events: [],
} as EditorialBundle;
describe('Prepare and publish screen', () => {
  it('rejects oversized ZIPs before reading their bytes', async () => {
    const f = TestBed.createComponent(PrepareAddon);
    await f.whenStable();
    const read = vi.fn();
    await f.componentInstance.chooseZip({
      target: { files: [{ name: 'large.zip', size: 51 * 1024 * 1024, arrayBuffer: read }] },
    } as unknown as Event);
    expect(read).not.toHaveBeenCalled();
    expect(f.componentInstance.error()).toContain('50 MiB');
  });
  const gateway = {
    loadEditorial: vi.fn(),
    publishPreparedAddon: vi.fn(),
    createDraftRelease: vi.fn(),
    uploadDraftZip: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    gateway.loadEditorial.mockResolvedValue(structuredClone(bundle));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'a' }) } },
        },
        { provide: SupabaseAdminGateway, useValue: gateway },
      ],
    });
  });
  it('never publishes on entry or without the explicit permission checkbox', async () => {
    const f = TestBed.createComponent(PrepareAddon);
    await f.whenStable();
    expect((f.nativeElement.querySelector('select') as HTMLSelectElement).value).toBe('r');
    await f.componentInstance.finish(true);
    expect(gateway.publishPreparedAddon).not.toHaveBeenCalled();
    expect(f.componentInstance.error()).toContain('permiso');
  });
  it('publishes a prepared draft with one action and blocks a double click', async () => {
    let finish!: () => void;
    gateway.publishPreparedAddon.mockImplementation(() => new Promise<void>((r) => (finish = r)));
    const f = TestBed.createComponent(PrepareAddon);
    await f.whenStable();
    const p = f.componentInstance;
    p.confirmed.set(true);
    const first = p.finish(true);
    await Promise.resolve();
    await Promise.resolve();
    await p.finish(true);
    expect(gateway.publishPreparedAddon).toHaveBeenCalledOnce();
    finish();
    await first;
    expect(gateway.createDraftRelease).not.toHaveBeenCalled();
    expect(gateway.uploadDraftZip).not.toHaveBeenCalled();
  });
  it('blocks replays after uncertain publication and keeps draft content', async () => {
    gateway.publishPreparedAddon.mockRejectedValue(new Error('Respuesta perdida'));
    const f = TestBed.createComponent(PrepareAddon);
    await f.whenStable();
    const p = f.componentInstance;
    p.confirmed.set(true);
    await p.finish(true);
    await p.finish(true);
    expect(gateway.publishPreparedAddon).toHaveBeenCalledOnce();
    expect(p.blocked()).toBe(true);
    expect(p.bundle()?.addon.status).toBe('draft');
  });
});
