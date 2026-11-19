import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  effect,
  DestroyRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicCatalog } from '../../core/catalog/public-catalog';
import { RouteMap } from '../../shared/ui/route-map/route-map';
import { StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { PageSeo } from '../../core/seo/page-seo';
@Component({
  selector: 'app-catalog',
  imports: [RouterLink, RouteMap, StatusBadge],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog {
  readonly catalog = inject(PublicCatalog);
  readonly categories = this.catalog.categories;
  readonly query = signal('');
  readonly category = signal('');
  readonly filtered = this.catalog.addons;
  readonly activeFilters = computed(() => !!this.query().trim() || !!this.category());
  readonly validation = signal('');
  readonly imageErrors = signal<ReadonlySet<string>>(new Set());
  imageFailed(slug: string): void {
    this.imageErrors.update((errors) => new Set([...errors, slug]));
  }
  constructor() {
    inject(PageSeo).update({
      title: 'Catálogo | WoW Forever Addons',
      description:
        'Encuentra herramientas gratuitas para WoW Forever. Busca por nombre, función o categoría y consulta sus versiones publicadas.',
      path: '/catalogo',
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    effect(() => {
      const query = this.query().trim(),
        category = this.category();
      clearTimeout(timer);
      if (!browser) {
        return;
      }
      this.validation.set(query.length > 160 ? 'La búsqueda admite hasta 160 caracteres.' : '');
      if (query.length <= 160) {
        timer = setTimeout(() => {
          void this.catalog.load(query, category);
        }, 300);
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
  reset(): void {
    this.query.set('');
    this.category.set('');
  }
}
