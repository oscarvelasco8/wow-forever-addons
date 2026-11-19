import { Injectable, TransferState, makeStateKey, inject, signal, afterNextRender, DestroyRef } from '@angular/core';
import {watchCatalogChanges} from './catalog-updates';
import type { PublicAddon } from './public-catalog.types';
export interface CatalogSnapshot {
  slug: string;
  addons: readonly PublicAddon[];
  state: 'ready' | 'error';
}
export const CATALOG_SNAPSHOT = makeStateKey<CatalogSnapshot | null>('wfa-public-addon');
@Injectable({ providedIn: 'root' })
export class PublicAddonDetail {
  readonly addons = signal<readonly PublicAddon[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  private slug = '';
  private controller?: AbortController;
  private generation = 0;
  constructor() {
    const destroy=inject(DestroyRef);
    afterNextRender(()=>{
      const visible=()=>{if(this.slug&&!this.controller&&document.visibilityState!=='hidden'&&location.pathname.startsWith('/addons/'))void this.load(this.slug,true);};
      const changed=()=>{this.controller?.abort();this.controller=undefined;this.generation++;this.addons.set([]);this.state.set('loading');visible();};
      const stop=watchCatalogChanges(changed);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);const timer=setInterval(visible,30000);
      window.addEventListener('pageshow',visible);
      destroy.onDestroy(()=>{stop();clearInterval(timer);window.removeEventListener('focus',visible);window.removeEventListener('pageshow',visible);document.removeEventListener('visibilitychange',visible);});
    });
    const transfer = inject(TransferState),
      snapshot = transfer.get(CATALOG_SNAPSHOT, null);
    transfer.remove(CATALOG_SNAPSHOT);
    if (snapshot) {
      this.seed(snapshot);
    }
  }
  seed(snapshot: CatalogSnapshot): void {
    this.slug = snapshot.slug;
    this.addons.set(snapshot.addons);
    this.state.set(snapshot.state);
  }
  async ensure(slug: string): Promise<void> {
    if (slug === this.slug && (this.controller || this.state() !== 'loading')) {
      return;
    }
    await this.load(slug);
  }
  async load(slug = this.slug,quiet=false): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.slug = slug;
    const generation = ++this.generation;
    if(!quiet){this.state.set('loading');this.addons.set([]);}
    try {
      const response = await fetch('/api/addon?slug=' + encodeURIComponent(slug), {
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
      });
      if (!response.ok && response.status !== 404) {
        throw new Error();
      }
      const result = await response.json();
      if (!('addon' in result) || (result.addon && result.addon.slug !== slug)) {
        throw new Error();
      }
      if (generation === this.generation) {
        this.addons.set(result.addon ? [result.addon] : []);
        this.state.set('ready');
      }
    } catch {
      if (generation === this.generation) {
        this.addons.set([]);
        this.state.set('error');
      }
    } finally {
      if (generation === this.generation) {
        this.controller = undefined;
      }
    }
  }
}
