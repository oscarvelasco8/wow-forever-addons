import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from '../../src/app/app';
import { Catalog } from '../../src/app/features/catalog/catalog';
import { AddonDetail } from '../../src/app/features/addon-detail/addon-detail';
bootstrapApplication(App, {
  providers: [
    provideRouter([
      { path: 'catalogo', component: Catalog },
      { path: 'addons/:slug', component: AddonDetail },
      { path: '**', redirectTo: 'catalogo' },
    ]),
  ],
}).catch(console.error);
