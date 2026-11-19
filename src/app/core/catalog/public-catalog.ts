import { Injectable, afterNextRender, signal } from '@angular/core';
import type { PublicAddon } from './public-catalog.types';
export interface PublicCategory {
  slug: string;
  name: string;
  order: number;
}
interface Page {
  addons: PublicAddon[];
  categories: PublicCategory[];
  nextCursor: string | null;
}
@Injectable({ providedIn: 'root' })
export class PublicCatalog {
  readonly addons = signal<readonly PublicAddon[]>([]);
  readonly categories = signal<PublicCategory[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly nextCursor = signal<string | null>(null);
  readonly moreLoading = signal(false);
  readonly moreError = signal('');
  private query = '';
  private category = '';
  private generation = 0;
  private controller?: AbortController;
  constructor() {
    afterNextRender(() => {
      void this.ensure();
    });
  }
  async ensure(query = '', category = ''): Promise<void> {
    if (
      query === this.query &&
      category === this.category &&
      (this.controller || this.state() === 'ready')
    ) {
      return;
    }
    await this.load(query, category);
  }
  private async page(
    query: string,
    category: string,
    cursor: string | undefined,
    signal: AbortSignal,
  ): Promise<Page> {
    const params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    }
    if (category) {
      params.set('category', category);
    }
    if (cursor) {
      params.set('cursor', cursor);
    }
    const response = await fetch('/api/catalog' + (params.size ? '?' + params : ''), {
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    });
    if (!response.ok) {
      throw new Error('Catalog unavailable.');
    }
    const result = await response.json();
    if (
      !Array.isArray(result.addons) ||
      !Array.isArray(result.categories) ||
      (result.nextCursor !== null && typeof result.nextCursor !== 'string')
    ) {
      throw new Error('Invalid catalog page.');
    }
    return result;
  }
  async load(query = this.query, category = this.category): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const generation = ++this.generation;
    this.query = query.trim();
    this.category = category;
    this.state.set('loading');
    this.addons.set([]);
    this.nextCursor.set(null);
    this.moreLoading.set(false);
    this.moreError.set('');
    try {
      const page = await this.page(this.query, this.category, undefined, controller.signal);
      if (generation !== this.generation) {
        return;
      }
      this.addons.set(page.addons);
      this.categories.set(page.categories);
      this.nextCursor.set(page.nextCursor);
      this.state.set('ready');
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
  async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.moreLoading() || this.state() !== 'ready') {
      return;
    }
    const generation = this.generation,
      controller = new AbortController();
    this.controller = controller;
    this.moreLoading.set(true);
    this.moreError.set('');
    try {
      const page = await this.page(this.query, this.category, cursor, controller.signal);
      if (generation !== this.generation) {
        return;
      }
      if (page.nextCursor === cursor) {
        throw new Error('Repeated catalog cursor.');
      }
      this.addons.update((items) => {
        const existing = new Set(items.map((item) => item.slug));
        return [...items, ...page.addons.filter((item) => !existing.has(item.slug))];
      });
      this.nextCursor.set(page.nextCursor);
      this.categories.set(page.categories);
    } catch {
      if (generation === this.generation) {
        this.moreError.set('No se pudieron cargar más addons. Puedes volver a intentarlo.');
      }
    } finally {
      if (generation === this.generation) {
        this.moreLoading.set(false);
        this.controller = undefined;
      }
    }
  }
}
