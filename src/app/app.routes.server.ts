import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'administracion/acceso', renderMode: RenderMode.Prerender },
  { path: 'administracion/recuperar', renderMode: RenderMode.Prerender },
  { path: 'administracion/denegado', renderMode: RenderMode.Prerender },
  { path: 'administracion', renderMode: RenderMode.Client },
  { path: 'catalogo', renderMode: RenderMode.Prerender },
  { path: 'addons/:slug', renderMode: RenderMode.Server },
  { path: '404', renderMode: RenderMode.Prerender },
  { path: 'apoyar', renderMode: RenderMode.Prerender },
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
