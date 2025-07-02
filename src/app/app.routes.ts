import { ProductViewScreenComponent } from './screens/product-view-screen/product-view-screen.component';
import { ProductCatalogScreenComponent } from './screens/product-catalog-screen/product-catalog-screen.component';
import { Routes } from '@angular/router';
import { CommunityScreenComponent } from './screens/community-screen/community-screen.component';
import { MsalGuard } from '@azure/msal-angular';
import { CatalogResolver } from './services/catalog-resolver.service';

export const routes: Routes = [
	{ path: ':catalogSlug', component: ProductCatalogScreenComponent, canActivate: [ MsalGuard ], resolve: { catalogs: CatalogResolver } },
	{ path: ':catalogSlug/community', component: CommunityScreenComponent, canActivate: [ MsalGuard ], resolve: { catalogs: CatalogResolver } },
	{ path: ':catalogSlug/item/:id', component: ProductViewScreenComponent, canActivate: [ MsalGuard ], resolve: { catalogs: CatalogResolver } }
];
