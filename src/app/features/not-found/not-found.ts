import { ChangeDetectionStrategy, Component,inject } from '@angular/core';
import { PageSeo } from '../../core/seo/page-seo';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section aria-labelledby="not-found-title">
      <p>404</p>
      <h1 id="not-found-title">Este camino no lleva a ninguna página.</h1>
      <p>La dirección puede haber cambiado o ya no estar disponible.</p>
      <a class="button secondary" routerLink="/catalogo">Explorar addons</a>
      <p><a routerLink="/">Volver al inicio</a></p>
    </section>
  `,
  styles: `section { max-width: 900px; margin: auto; padding: 80px 20px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {constructor(){inject(PageSeo).update({title:'Página no encontrada | WoW Forever Addons',description:'La página solicitada no existe. Vuelve al inicio o explora el catálogo de addons.',noindex:true});}}
