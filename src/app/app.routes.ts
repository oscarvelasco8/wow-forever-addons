import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { draftLeaveGuard } from './core/catalog/draft-leave.guard';

export const routes: Routes = [
  {path:'administracion/addons/:id/preparar',canActivate:[adminGuard],canDeactivate:[draftLeaveGuard],title:'Preparar y publicar | WoW Forever Addons',loadComponent:()=>import('./features/admin/prepare-addon').then(m=>m.PrepareAddon)},
  {path:'administracion/addons/nuevo',canActivate:[adminGuard],canDeactivate:[draftLeaveGuard],title:'Nuevo addon | WoW Forever Addons',loadComponent:()=>import('./features/admin/new-addon').then(m=>m.NewAddon)},
  { path:'404',title:'Página no encontrada | WoW Forever Addons',loadComponent:()=>import('./features/not-found/not-found').then(module=>module.NotFound) },
  {
    path:'administracion/categorias',canActivate:[adminGuard],canDeactivate:[draftLeaveGuard],title:'Categorías | WoW Forever Addons',
    loadComponent:()=>import('./features/admin/categories').then(module=>module.AdminCategories),
  },
  {
    path: 'administracion/addons/:id/publicacion', canActivate: [adminGuard], canDeactivate: [draftLeaveGuard],
    title: 'Revisión editorial | WoW Forever Addons',
    loadComponent: () => import('./features/admin/editorial').then(module => module.Editorial),
  },
  {
    path: 'administracion/addons/:id/archivos', canActivate: [adminGuard], canDeactivate: [draftLeaveGuard],
    title: 'Archivos del borrador | WoW Forever Addons',
    loadComponent: () => import('./features/admin/draft-assets').then(module => module.DraftAssets),
  },
  {
    path: 'administracion/addons/:id', canActivate: [adminGuard], canDeactivate: [draftLeaveGuard],
    title: 'Editar borrador | WoW Forever Addons',
    loadComponent: () => import('./features/admin/draft-editor').then(module => module.DraftEditor),
  },
  {
    path: 'administracion/restablecer',
    title: 'Restablecer contraseña | WoW Forever Addons',
    loadComponent: () => import('./features/admin/reset-password').then((module) => module.ResetPassword),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'WoW Forever Addons | Herramientas de la comunidad',
    loadComponent: () => import('./features/home/home').then((module) => module.Home),
  },
  {
    path: 'catalogo',
    title: 'Catálogo | WoW Forever Addons',
    loadComponent: () => import('./features/catalog/catalog').then((module) => module.Catalog),
  },
  {
    path: 'addons/:slug',
    title: 'Ficha de addon | WoW Forever Addons',
    loadComponent: () => import('./features/addon-detail/addon-detail').then((module) => module.AddonDetail),
  },
  {
    path: 'apoyar',
    title: 'Apoya la plataforma | WoW Forever Addons',
    loadComponent: () => import('./features/support/support').then((module) => module.Support),
  },
  {
    path: 'administracion/acceso',
    title: 'Acceso del equipo | WoW Forever Addons',
    loadComponent: () => import('./features/admin/login').then((module) => module.AdminLogin),
  },
  {
    path: 'administracion/recuperar',
    title: 'Recuperar acceso | WoW Forever Addons',
    loadComponent: () => import('./features/admin/recovery').then((module) => module.AdminRecovery),
  },
  {
    path: 'administracion/denegado',
    title: 'Acceso no autorizado | WoW Forever Addons',
    loadComponent: () => import('./features/admin/access-denied').then((module) => module.AccessDenied),
  },
  {
    path: 'administracion/verificar',
    title: 'Verificación en dos pasos | WoW Forever Addons',
    loadComponent: () => import('./features/admin/mfa').then((module) => module.AdminMfa),
  },
  {
    path: 'administracion',
    canActivate: [adminGuard],
    title: 'Administración | WoW Forever Addons',
    loadComponent: () => import('./features/admin/admin-home').then((module) => module.AdminHome),
  },
  {
    path: '**',
    title: 'Página no encontrada | WoW Forever Addons',
    loadComponent: () => import('./features/not-found/not-found').then((module) => module.NotFound),
  },
];
