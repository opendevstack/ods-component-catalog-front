import { NotificationsScreenComponent } from './screens/notifications-screen/notifications-screen.component';
import { ProductViewScreenComponent } from './screens/product-view-screen/product-view-screen.component';
import { ProductCatalogScreenComponent } from './screens/product-catalog-screen/product-catalog-screen.component';
import { Routes } from '@angular/router';
import { CommunityScreenComponent } from './screens/community-screen/community-screen.component';
import { MsalGuard } from '@azure/msal-angular';
import { CatalogResolver } from './services/catalog-resolver.service';
import { ProductActionScreenComponent } from './screens/product-action-screen/product-action-screen.component';
import { ProjectComponentsScreenComponent } from './screens/project-components-screen/project-components-screen.component';
import { PageNotFoundScreenComponent } from './screens/page-not-found-screen/page-not-found-screen.component';

export const routes: Routes = [
	{ path: '', component: ProductCatalogScreenComponent, canActivate: [ MsalGuard ], resolve: { catalogs: CatalogResolver } },
	{ path: 'notifications', component: NotificationsScreenComponent, canActivate: [ MsalGuard ] },
	{ path: 'page-not-found', component: PageNotFoundScreenComponent },
	{ path: ':projectKey/components', component: ProjectComponentsScreenComponent, canActivate: [ MsalGuard ] },
	{ path: ':catalogSlug', component: ProductCatalogScreenComponent, canActivate: [ MsalGuard ], resolve: { catalogs: CatalogResolver } },
	{ path: ':catalogSlug/community', component: CommunityScreenComponent, canActivate: [ MsalGuard ], resolve: { catalogs: CatalogResolver } },
	{ path: ':catalogSlug/item/:id', component: ProductViewScreenComponent, canActivate: [ MsalGuard ], resolve: { catalogs: CatalogResolver } },
	{ path: ':catalogSlug/item/:id/:action', component: ProductActionScreenComponent, canActivate: [ MsalGuard ], resolve: { catalogs: CatalogResolver } },
	{path: '**', component: PageNotFoundScreenComponent}
];
