import { ChangeDetectionStrategy, Component, inject, input, OnDestroy } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink],
  template: `
    <div class="container auth-layout">
      <section class="auth-intro" aria-labelledby="admin-intro-title">
        <a routerLink="/catalogo" class="back-link">← Volver al catálogo</a>
        <p class="eyebrow">WoW Forever Addons · Administración</p>
        <h1 id="admin-intro-title">Cuidar la colección<br>empieza <em>aquí.</em></h1>
        <p class="intro-copy">Un espacio para quienes mantienen los addons, revisan sus versiones y preparan cada nueva publicación.</p>
        <div class="access-note"><span aria-hidden="true">◇</span><div><strong>Solo para administradores</strong><p>Explorar y descargar addons no requiere una cuenta. Este acceso es exclusivo del equipo del proyecto.</p></div></div>
      </section>
      <section class="auth-panel" aria-labelledby="auth-panel-title">
        <div class="panel-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="5" y="12" width="18" height="13" rx="1"/><path d="M9 12V8a5 5 0 0 1 10 0v4M14 17v4"/></svg></div>
        <p class="eyebrow">{{ eyebrow() }}</p>
        <h2 id="auth-panel-title">{{ title() }}</h2>
        <p class="panel-description">{{ description() }}</p>
        <ng-content />
      </section>
    </div>
  `,
  styleUrl: './auth-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShell implements OnDestroy {
  private readonly meta = inject(Meta);
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly eyebrow = input('Área de gestión');
  constructor() { this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' }); }
  ngOnDestroy(): void { this.meta.removeTag('name="robots"'); }
}
