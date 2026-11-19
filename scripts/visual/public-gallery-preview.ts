import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { App } from '../../src/app/app';
import { AddonDetail } from '../../src/app/features/addon-detail/addon-detail';
import { PublicAddonDetail } from '../../src/app/core/catalog/public-addon-detail';
import type { PublicAddon } from '../../src/app/core/catalog/public-catalog.types';

const sample: PublicAddon = {
  slug: 'addon-de-ejemplo',
  name: 'Addon de ejemplo',
  category: 'Exploración', categorySlug:'exploracion',categoryOrder:0,
  summary: 'Una ficha ficticia para revisar la nueva galería.',
  description:
    'La galería permite recorrer las imágenes publicadas sin salir de la ficha. Este contenido es una ilustración de ejemplo para revisar la presentación; no es una captura de Rumbo ni de World of Warcraft.',
  installationInstructions:
    'Descomprime el archivo en la carpeta de addons de tu cliente y activa el addon al entrar. Instrucciones ficticias de esta vista previa.',
  author: 'Equipo de ejemplo',
  license: 'Ilustraciones originales de demostración',
  credits: 'Galería de prueba visual, sin publicación ni descarga real.',
  releases: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      version: '1.0.0-ejemplo',
      gameVersion: 'Forever 1.60.1',
      interfaceVersion: 16001,
      changelog: 'Primera versión ficticia para comprobar la ficha.',
      publishedAt: '2026-11-19T08:00:00Z',
    },
  ],
  images: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      altText: 'Ilustración de ejemplo: recorrido entre puntos de interés.',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      altText: 'Ilustración de ejemplo: lista de objetivos de una ruta.',
    },
    {
      id: new URLSearchParams(location.search).has('error')
        ? '44444444-4444-4444-8444-444444444444'
        : '33333333-3333-4333-8333-333333333333',
      altText: 'Ilustración de ejemplo: preferencias de navegación.',
    },
  ],
};
bootstrapApplication(App, {
  providers: [
    provideRouter([
      { path: 'addons/:slug', component: AddonDetail },
      { path: '**', redirectTo: 'addons/addon-de-ejemplo' },
    ]),
    {
      provide: PublicAddonDetail,
      useValue: { addons: signal([sample]), state: signal('ready'), ensure:async()=>{},load: async () => {} },
    },
  ],
}).catch(console.error);
