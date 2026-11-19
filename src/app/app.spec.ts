import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { PublicCatalog } from './core/catalog/public-catalog';
import { PublicAddonDetail } from './core/catalog/public-addon-detail';

describe('Public routing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ addons: [],categories:[],nextCursor:null,addon:null }) }));
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('explains free distribution without offering an unavailable download or payment', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    await TestBed.inject(PublicCatalog).load();
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    expect(page.querySelector('h1')?.textContent).toContain('Tus herramientas.');
    expect(page.textContent).toContain('sin crear una cuenta');
    expect(page.textContent).toContain('todavía no están disponibles');
    expect(page.querySelector('a[href="/catalogo"]')).toBeTruthy();
  });

  it('provides a way home for unknown client routes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ruta-inexistente');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('ninguna página');
    expect(harness.routeNativeElement?.querySelector('a[href="/"]')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('a[href="/catalogo"]')).toBeTruthy();
  });

  it('does not reveal a draft through its old hardcoded detail URL', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/addons/rumbo');
    await TestBed.inject(PublicAddonDetail).load('rumbo');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Este addon no está disponible');
    expect(harness.routeNativeElement?.querySelector('a[href^="/api/download"]')).toBeNull();
  });
});
