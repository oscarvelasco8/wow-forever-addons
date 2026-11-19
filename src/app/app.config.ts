import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { ADMIN_AUTH_GATEWAY } from './core/auth/admin-access';
import { SupabaseAdminGateway } from './core/auth/supabase-admin-gateway';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ADMIN_AUTH_GATEWAY, useExisting: SupabaseAdminGateway },
    provideAppInitializer(() => inject(SupabaseAdminGateway).initialize()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
    })), provideClientHydration()
  ]
};
