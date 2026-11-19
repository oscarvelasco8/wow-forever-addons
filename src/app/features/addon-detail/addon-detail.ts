import { ChangeDetectionStrategy, Component, computed, effect, inject, signal,PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageSeo } from '../../core/seo/page-seo';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicAddonDetail } from '../../core/catalog/public-addon-detail';
import { RouteMap } from '../../shared/ui/route-map/route-map';
import { StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { AddonGallery } from './addon-gallery';

@Component({
  selector: 'app-addon-detail',
  imports: [RouterLink, RouteMap, StatusBadge, AddonGallery],
  templateUrl: './addon-detail.html',
  styleUrl: './addon-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddonDetail {
  readonly catalog = inject(PublicAddonDetail);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(PageSeo);
  private readonly slug = signal('');
  readonly addon = computed(() => this.catalog.addons().find(addon => addon.slug === this.slug()));
  constructor() {
    const browser=isPlatformBrowser(inject(PLATFORM_ID));
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => this.slug.set(params.get('slug') ?? ''));
    effect(()=>{const slug=this.slug();if(browser){void this.catalog.ensure(slug);}});
    effect(() => {
      const addon = this.addon();
      if(this.catalog.state()==='loading'){this.seo.update({title:'Cargando ficha | WoW Forever Addons',description:'Consultando la colección de addons.',noindex:true});}
      else if(this.catalog.state()==='error'){this.seo.update({title:'Ficha temporalmente no disponible | WoW Forever Addons',description:'No podemos consultar la ficha en este momento. Vuelve a intentarlo más tarde.',noindex:true});}
      else if(!addon){this.seo.update({title:'Addon no disponible | WoW Forever Addons',description:'Este addon no está disponible. Consulta las herramientas publicadas en el catálogo.',noindex:true});}
      else{this.seo.update({title:`${addon.name} | WoW Forever Addons`,description:addon.summary,path:`/addons/${addon.slug}`,imageId:addon.images[0]?.id});}
    });
  }
}
