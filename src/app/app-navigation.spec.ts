import { Component, inject, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { App } from './app';
import { PageSeo, SITE_ORIGIN } from './core/seo/page-seo';
@Component({ template: '<h1>Página de prueba</h1>' })
class Destination {
  constructor() {
    const path = inject(ActivatedRoute).snapshot.routeConfig?.path;
    inject(PageSeo).update({
      title: 'Destino',
      description: 'Descripción del destino',
      path: `/${path}`,
    });
  }
}
describe('Accessible route transitions', () => {
  it('moves focus to main after navigation and preserves metadata for fragment-only changes', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'primera', component: Destination },
          { path: 'segunda', component: Destination },
        ]),
      ],
    });
    TestBed.inject(TransferState).set(SITE_ORIGIN, 'https://addons.example.test');
    const fixture = TestBed.createComponent(App),
      router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/primera');
    await fixture.whenStable();
    await router.navigateByUrl('/segunda');
    await fixture.whenStable();
    expect(document.activeElement?.id).toBe('contenido');
    await router.navigateByUrl('/segunda#contenido');
    await fixture.whenStable();
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Descripción del destino',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://addons.example.test/segunda',
    );
  });
});
