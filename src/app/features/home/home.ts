import { ChangeDetectionStrategy, Component, inject,afterNextRender } from '@angular/core';
import { PublicCatalog } from '../../core/catalog/public-catalog';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { CollectionPreview } from '../../shared/ui/collection-preview/collection-preview';
import { PageSeo } from '../../core/seo/page-seo';

@Component({
  selector: 'app-home',
  imports: [RouterLink, StatusBadge, CollectionPreview],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home { readonly catalog = inject(PublicCatalog);constructor(){afterNextRender(()=>{void this.catalog.ensure();});inject(PageSeo).update({title:'WoW Forever Addons | Herramientas de la comunidad',description:'Explora addons gratuitos para WoW Forever. Todas sus funciones, sin cuenta ni pago, con apoyo voluntario al proyecto.',path:'/'});} }
