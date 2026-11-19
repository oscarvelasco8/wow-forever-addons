import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-route-map',
  templateUrl: './route-map.html',
  styleUrl: './route-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteMap {}
