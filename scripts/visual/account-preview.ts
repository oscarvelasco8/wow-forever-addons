import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from '../../src/app/app';
import { AdminAccount } from '../../src/app/features/admin/account';
import { SupabaseAdminGateway } from '../../src/app/core/auth/supabase-admin-gateway';

bootstrapApplication(App, { providers: [
  { provide: SupabaseAdminGateway, useValue: {
    accountEmail: async () => ({ email: 'equipo@example.test', pending: '', verified: true }),
    requestEmailChange: async () => { throw new Error('Vista de ejemplo sin envío de correo.'); },
  } },
  provideRouter([{ path: '**', component: AdminAccount }]),
] });
