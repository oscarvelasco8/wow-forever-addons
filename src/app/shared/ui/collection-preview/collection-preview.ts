import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicCatalog } from '../../../core/catalog/public-catalog';
import { StatusBadge } from '../status-badge/status-badge';

@Component({
  selector: 'app-collection-preview',
  imports: [RouterLink, StatusBadge],
  templateUrl: './collection-preview.html',
  styleUrl: './collection-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionPreview { readonly catalog = inject(PublicCatalog); readonly addons = this.catalog.addons; }
