import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  template: '<span><ng-content /></span>',
  styles: `span { display: inline-flex; align-items: center; gap: 7px; padding: 4px 10px; border: 1px solid #92ac8750; color: #bdd0af; background: #92ac870d; font-size: .65rem; letter-spacing: .1em; text-transform: uppercase; } span::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: currentColor; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {}
