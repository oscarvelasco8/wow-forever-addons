import { TestBed } from '@angular/core/testing';
import { TransferState } from '@angular/core';
import { PageSeo, SITE_ORIGIN } from './page-seo';
describe('Page metadata', () => {
  afterEach(() => {
    document.querySelector('link[rel="canonical"]')?.remove();
  });
  it('uses the configured canonical origin and removes product metadata on errors', () => {
    TestBed.inject(TransferState).set(SITE_ORIGIN, 'https://addons.example.test');
    const seo = TestBed.inject(PageSeo);
    seo.update({
      title: 'Addon de prueba',
      description: 'Resumen con <etiquetas> y "comillas"',
      path: '/addons/prueba',
      imageId: 'image-id',
    });
    expect(document.title).toBe('Addon de prueba');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      '<etiquetas>',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://addons.example.test/addons/prueba',
    );
    expect(document.querySelector('meta[property="og:image"]')).not.toBeNull();
    seo.update({ title: 'No disponible', description: 'No disponible', noindex: true });
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[property="og:image"]')).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });
  it('does not invent a domain and keeps unconfigured previews unindexed', () => {
    const seo = TestBed.inject(PageSeo);
    seo.update({ title: 'Catálogo', description: 'Colección', path: '/catalogo' });
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });
});
