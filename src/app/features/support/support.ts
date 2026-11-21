import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageSeo } from '../../core/seo/page-seo';
@Component({selector:'app-support',imports:[RouterLink],templateUrl:'./support.html',styleUrl:'./support.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class Support {
 constructor(){inject(PageSeo).update({title:'Apoya la plataforma | WoW Forever Addons',description:'Apoya voluntariamente el mantenimiento de WoW Forever Addons. Las aportaciones no conceden acceso ni ventajas.',path:'/apoyar'});}
}
