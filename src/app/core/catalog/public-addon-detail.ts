import { Injectable, TransferState, makeStateKey, inject, signal } from '@angular/core';
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
  async load(slug = this.slug): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.slug = slug;
    const generation = ++this.generation;
    this.state.set('loading');
    this.addons.set([]);
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
        this.state.set('error');
      }
    } finally {
      if (generation === this.generation) {
        this.controller = undefined;
      }
    }
  }
}
