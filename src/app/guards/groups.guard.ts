import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { AzureService } from '../services/azure.service';
import { CatalogService } from '../services/catalog.service';

@Injectable({ providedIn: 'root' })
export class GroupsGuard implements CanActivate {
  constructor(
    private azureService: AzureService,
    private catalogService: CatalogService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredOwners = route.data?.['requiredOwners'] === true;
    const requiredGroups: string[] = Array.isArray(route.data?.['requiredGroups'])
      ? route.data['requiredGroups']
      : [];

    if (!requiredOwners && requiredGroups.length === 0) {
      return of(true);
    }

    return forkJoin([
      this.resolveUserGroups(),
      this.resolveCatalogOwnersFromRoute(route)
    ]).pipe(
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

  private resolveUserGroups(): Observable<string[]> {
    return this.azureService.loadUserGroups().pipe(
      map(groups => Array.isArray(groups) ? groups.filter(Boolean) : []),
      tap(groups => this.azureService.userGroups$.next(groups)),
      catchError(() => of([]))
    );
  }

  private resolveCatalogOwnersFromRoute(route: ActivatedRouteSnapshot): Observable<string[]> {
    const catalogSlugParam = route.paramMap.get('catalogSlug');
    if (!catalogSlugParam) {
      return of([]);
    }

    const normalizedCatalogSlug = this.catalogService.getSlugUrl(catalogSlugParam);
    const cachedDescriptors = this.catalogService.getCatalogDescriptors();

    const descriptors$ = cachedDescriptors.length > 0
      ? of(cachedDescriptors)
      : this.catalogService.retrieveCatalogDescriptors().pipe(
          tap(descriptors => this.catalogService.setCatalogDescriptors(descriptors)),
          catchError(() => of([]))
        );

    return descriptors$.pipe(
      map(descriptors => descriptors.find(descriptor =>
        descriptor.slug && this.catalogService.getSlugUrl(descriptor.slug) === normalizedCatalogSlug
      )),
      switchMap(descriptor => {
        if (!descriptor?.id) {
          return of([]);
        }

        const descriptorOwners = (descriptor as any).owners;
        if (Array.isArray(descriptorOwners)) {
          return of(descriptorOwners.filter(Boolean));
        }

        return this.catalogService.getCatalog(descriptor.id).pipe(
          map(catalog => Array.isArray((catalog as any).owners) ? (catalog as any).owners.filter(Boolean) : []),
          catchError(() => of([]))
        );
      })
    );
  }
}