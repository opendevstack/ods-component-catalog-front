import { Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AppShellIconComponent } from '@opendevstack/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-page-not-found-screen',
  imports: [AppShellIconComponent, MatButtonModule],
  templateUrl: './page-not-found-screen.component.html',
  styleUrl: './page-not-found-screen.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PageNotFoundScreenComponent {
  constructor(private readonly catalogService: CatalogService, private readonly router: Router) {}

  goToMarketplace(): void {
    const catalogs = this.catalogService.getCatalogDescriptors();
    const defaultCatalogSlug = this.catalogService.getSelectedCatalogSlug() ??
            (catalogs[0] ? this.catalogService.getSlugUrl(catalogs[0].slug!) : null);
    if (defaultCatalogSlug) {
      this.router.navigate([`/${defaultCatalogSlug}`]);
    }
  }

}
