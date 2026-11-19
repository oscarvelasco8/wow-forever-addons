import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAccess } from './admin-access';

// Navigation convenience only. Database RLS and server checks enforce security.
export const adminGuard: CanActivateFn = async () => {
  const access = inject(AdminAccess);
  const router = inject(Router);
  const decision = await access.checkAccess();
  if (decision === 'admin') { return true; }
  if (decision === 'mfa-required') { return router.parseUrl('/administracion/verificar'); }
  return router.parseUrl(decision === 'forbidden'
    ? '/administracion/denegado'
    : '/administracion/acceso');
};
