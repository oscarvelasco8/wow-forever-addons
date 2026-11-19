import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  afterNextRender,
  viewChild,
  ElementRef,
} from '@angular/core';
import type { PublicImage } from '../../core/catalog/public-catalog.types';

@Component({
  selector: 'app-addon-gallery',
  templateUrl: './addon-gallery.html',
  styleUrl: './addon-gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddonGallery {
  private readonly mainImage = viewChild<ElementRef<HTMLImageElement>>('mainImage');
  private readonly rendered = signal(false);
  constructor() {
    afterNextRender(() => {
      this.rendered.set(true);
      const image = this.mainImage()?.nativeElement;
      if (image?.complete) {
        this.mark(this.key(), image.naturalWidth ? 'ready' : 'error');
      }
    });
  }
  readonly images = input.required<readonly PublicImage[]>();
  private readonly selectedId = signal('');
  private readonly attempt = signal(0);
  private readonly result = signal({ key: '', state: 'loading' as 'loading' | 'ready' | 'error' });
  readonly thumbnailErrors = signal<ReadonlySet<string>>(new Set());
  readonly current = computed(
    () => this.images().find((image) => image.id === this.selectedId()) ?? this.images()[0],
  );
  readonly position = computed(() =>
    this.images().findIndex((image) => image.id === this.current()?.id),
  );
  readonly key = computed(() => `${this.current()?.id}:${this.attempt()}`);
  readonly phase = computed(() =>
    this.result().key === this.key() ? this.result().state : this.rendered() ? 'loading' : 'ready',
  );
  url(id: string, retry = 0, size = 'thumb'): string {
    return `/api/image?image=${encodeURIComponent(id)}&size=${size}${retry ? `&retry=${retry}` : ''}`;
  }
  currentUrl(): string {
    return this.url(this.current()!.id, this.attempt(), 'display');
  }
  currentSrcset(): string {
    return (
      this.url(this.current()!.id, this.attempt(), 'card') +
      ' 640w, ' +
      this.currentUrl() +
      ' 1280w'
    );
  }
  select(id: string): void {
    if (id === this.current()?.id) {
      return;
    }
    this.result.set({ key: '', state: 'loading' });
    this.attempt.set(0);
    this.selectedId.set(id);
  }
  step(direction: number): void {
    const images = this.images();
    if (images.length) {
      this.select(images[(this.position() + direction + images.length) % images.length].id);
    }
  }
  mark(key: string, state: 'ready' | 'error'): void {
    if (key === this.key()) {
      this.result.set({ key, state });
    }
  }
  retry(): void {
    this.attempt.update((attempt) => attempt + 1);
  }
  thumbnailFailed(id: string): void {
    this.thumbnailErrors.update((ids) => new Set([...ids, id]));
  }
}
