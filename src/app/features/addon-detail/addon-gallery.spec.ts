import { TestBed } from '@angular/core/testing';
import { AddonGallery } from './addon-gallery';
const images = [
  { id: '11111111-1111-4111-8111-111111111111', altText: 'Vista del mapa' },
  { id: '22222222-2222-4222-8222-222222222222', altText: 'Lista de objetivos' },
];
describe('Public addon gallery', () => {
  it('recognizes an image already decoded before hydration instead of leaving the loading overlay',async()=>{
    const complete=vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true),width=vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(320);
    try{const fixture=page();await fixture.whenStable();expect(fixture.componentInstance.phase()).toBe('ready');expect(fixture.nativeElement.textContent).not.toContain('Cargando imagen');}
    finally{complete.mockRestore();width.mockRestore();}
  });
  function page() {
    const fixture = TestBed.createComponent(AddonGallery);
    fixture.componentRef.setInput('images', images);
    fixture.detectChanges();
    return fixture;
  }
  it('provides labelled thumbnail controls and changes the selected image without navigating away', () => {
    const fixture = page(),
      root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.main-image')?.getAttribute('alt')).toBe('Vista del mapa');
    expect(root.querySelectorAll('.thumbnail')[0].getAttribute('aria-pressed')).toBe('true');
    (root.querySelectorAll('.thumbnail')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.main-image')?.getAttribute('alt')).toBe('Lista de objetivos');
    expect(root.querySelectorAll('.thumbnail')[1].getAttribute('aria-pressed')).toBe('true');
    fixture.componentInstance.step(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.position()).toBe(0);
  });
  it('shows a retry on failure and ignores late events belonging to another image', () => {
    const fixture = page(),
      gallery = fixture.componentInstance;
    const first = gallery.key();
    gallery.mark(first, 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Esta imagen no está disponible');
    (fixture.nativeElement.querySelector('.error button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.main-image').getAttribute('src')).toContain(
      '&retry=1',
    );
    expect(fixture.nativeElement.querySelector('.main-image').getAttribute('srcset')).toContain('&size=card&retry=1');
    expect(gallery.phase()).toBe('loading');
    gallery.select(images[1].id);
    gallery.mark(first, 'ready');
    expect(gallery.phase()).toBe('loading');
    gallery.mark(gallery.key(), 'ready');
    expect(gallery.phase()).toBe('ready');
  });
  it('keeps a failed thumbnail usable and falls back safely when the catalog changes', () => {
    const fixture = page(),
      gallery = fixture.componentInstance;
    gallery.thumbnailFailed(images[1].id);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelectorAll('.thumbnail')[1] as HTMLButtonElement;
    expect(button.textContent).toContain('Vista 2');
    button.click();
    fixture.detectChanges();
    expect(gallery.current()?.id).toBe(images[1].id);
    fixture.componentRef.setInput('images', [images[0]]);
    fixture.detectChanges();
    expect(gallery.current()?.id).toBe(images[0].id);
    expect(fixture.nativeElement.querySelector('.navigation')).toBeNull();
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gallery')).toBeNull();
  });
});
