import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { AzureService } from '../services/azure.service';
import { CatalogOwnersGroupAccessStore } from '../services/catalog-owners-group-access-store.service';

@Injectable({ providedIn: 'root' })
export class GroupsGuard implements CanActivate {
  constructor(
    private azureService: AzureService,
    private catalogOwnersGroupAccessStore: CatalogOwnersGroupAccessStore,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredOwners = route.data?.['requiredOwners'] === true;
    const requiredGroups: string[] = Array.isArray(route.data?.['requiredGroups'])
      ? route.data['requiredGroups']
      : [];

    const userGroups$ = this.azureService.userGroups$.pipe(take(1));
    const catalogOwners$ = this.catalogOwnersGroupAccessStore.currentOwners$.pipe(take(1));

    return combineLatest([userGroups$, catalogOwners$]).pipe(
      map(([userGroups, owners]) => {
        const hasOwnerAccess =
          requiredOwners &&
          Array.isArray(userGroups) &&
          Array.isArray(owners) &&
          owners.some(owner => userGroups.includes(owner));

        const hasRequiredGroupAccess =
          requiredGroups.length > 0 &&
          Array.isArray(userGroups) &&
          requiredGroups.some(group => userGroups.includes(group));

        const hasAccess = hasOwnerAccess || hasRequiredGroupAccess;
        //return true;
        return hasAccess ? true : this.router.parseUrl('/page-not-found');
      }),
      catchError(() => of(this.router.parseUrl('/page-not-found')))
    );
  }
}