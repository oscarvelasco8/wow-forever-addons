import {
  mergeApplicationConfig,
  ApplicationConfig,
  provideAppInitializer,
  inject,
  REQUEST,
  RESPONSE_INIT,
  TransferState,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import {
  PublicAddonDetail,
  CATALOG_SNAPSHOT,
  type CatalogSnapshot,
} from './core/catalog/public-addon-detail';
import { readPublicCatalog } from '../../server/catalog';
import { readSupabasePublicConfig } from '../../server/config/supabase';
import { readSiteOrigin } from '../../server/config/site';
import { SITE_ORIGIN } from './core/seo/page-seo';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideAppInitializer(async () => {
      const request = inject(REQUEST),
        response = inject(RESPONSE_INIT),
        transfer = inject(TransferState);
      transfer.set(SITE_ORIGIN, readSiteOrigin(process.env['PUBLIC_SITE_URL']));
      if (!request || !new URL(request.url).pathname.startsWith('/addons/')) {
        return;
      }
      const catalog = inject(PublicAddonDetail),
        slug = new URL(request.url).pathname.slice('/addons/'.length);
      let snapshot: CatalogSnapshot;
      try {
        const config = readSupabasePublicConfig(process.env);
        if (!config) {
          throw new Error('Unavailable configuration.');
        }
        snapshot = {
          slug,addons: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? await readPublicCatalog(config,fetch,slug) : [],
          state: 'ready',
        };
        if (response) {
          response.status = snapshot.addons.some((addon) => addon.slug === slug) ? 200 : 404;
        }
      } catch {
        snapshot = { slug,addons: [], state: 'error' };
        if (response) {
          response.status = 503;
        }
      }
      catalog.seed(snapshot);
      transfer.set(CATALOG_SNAPSHOT, snapshot);
      if (response) {
        response.headers = { 'Cache-Control': 'no-store' };
      }
    }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
