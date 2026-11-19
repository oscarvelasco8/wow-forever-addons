import { DOCUMENT, Injectable, TransferState, inject, makeStateKey } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
export const SITE_ORIGIN = makeStateKey<string | null>('wfa-site-origin');
const fallback =
  'Addons gratuitos para WoW Forever, con todas sus funciones y apoyo voluntario a la plataforma.';
@Injectable({ providedIn: 'root' })
export class PageSeo {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly origin = inject(TransferState).get(SITE_ORIGIN, null);
  clear(): void {
    this.meta.updateTag({ name: 'description', content: fallback });
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    for (const property of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']) {
      this.meta.removeTag(`property="${property}"`);
    }
    const canonical = this.document.querySelector('link[rel="canonical"]');
    canonical?.parentNode?.removeChild(canonical);
  }
  update(options: {
    title: string;
    description: string;
    path?: string;
    noindex?: boolean;
    imageId?: string;
  }): void {
    this.clear();
    this.title.setTitle(options.title);
    this.meta.updateTag({ name: 'description', content: options.description });
    this.meta.updateTag({
      name: 'robots',
      content: options.noindex || !this.origin ? 'noindex, nofollow' : 'index, follow',
    });
    this.meta.updateTag({ property: 'og:title', content: options.title });
    this.meta.updateTag({ property: 'og:description', content: options.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    if (this.origin && options.path && !options.noindex) {
      const canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = new URL(options.path, this.origin).href;
      this.document.head.appendChild(canonical);
      this.meta.updateTag({ property: 'og:url', content: canonical.href });
      if (options.imageId) {
        this.meta.updateTag({
          property: 'og:image',
          content: `${this.origin}/api/image?image=${encodeURIComponent(options.imageId)}&size=card`,
        });
      }
    }
  }
}
