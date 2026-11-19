import { Component, inject, Injector, afterNextRender, DOCUMENT } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationStart,
  NavigationEnd,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageSeo } from './core/seo/page-seo';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly router = inject(Router);
  constructor() {
    const seo = inject(PageSeo),
      document = inject(DOCUMENT),
      injector = inject(Injector);
    let first = true;
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (
        event instanceof NavigationStart &&
        event.url.split(/[?#]/)[0] !== this.router.url.split(/[?#]/)[0]
      ) {
        seo.clear();
      }
      if (event instanceof NavigationEnd) {
        if (!first && !event.urlAfterRedirects.includes('#')) {
          afterNextRender(
            () => document.getElementById('contenido')?.focus({ preventScroll: true }),
            { injector },
          );
        }
        first = false;
      }
    });
  }
}
