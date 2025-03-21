import { ProductViewScreenComponent } from './screens/product-view-screen/product-view-screen.component';
import { ProductCatalogScreenComponent } from './screens/product-catalog-screen/product-catalog-screen.component';
import { Routes } from '@angular/router';
import { CommunityScreenComponent } from './screens/community-screen/community-screen.component';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
	{ path: '', component: ProductCatalogScreenComponent, canActivate: [ MsalGuard ] },
	{ path: 'community', component: CommunityScreenComponent, canActivate: [ MsalGuard ] },
	{ path: 'item/:id', component: ProductViewScreenComponent, canActivate: [ MsalGuard ] }
];
