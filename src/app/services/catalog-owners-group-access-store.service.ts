import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { CatalogService } from './catalog.service';

type CatalogDescriptorWithOwners = {
  id?: string;
  slug?: string;
  owners?: string[];
};

@Injectable({ providedIn: 'root' })
export class CatalogOwnersGroupAccessStore {
  private currentOwnersSubject = new BehaviorSubject<string[]>([]);
  public currentOwners$ = this.currentOwnersSubject.asObservable();

  constructor(private catalogService: CatalogService) {
    this.catalogService.selectedCatalogSlug$
      .pipe(
        switchMap(slug => {
          if (!slug) {
            return of<string[]>([]);
          }
          return this.refreshOwnersForSelectedCatalog(slug);
        })
      )
      .subscribe(this.currentOwnersSubject);
  }

  private refreshOwnersForSelectedCatalog(slug: string): Observable<string[]> {
    const descriptor = this.catalogService.getSelectedCatalogDescriptor();
    const descriptorOwners = (descriptor as CatalogDescriptorWithOwners | undefined)?.owners;
    if (Array.isArray(descriptorOwners)) {
      return of(descriptorOwners);
    }

    const descriptorFromList = this.catalogService.getCatalogDescriptors()
      .find(c => this.catalogService.getSlugUrl(c.slug!) === slug);

    if (!descriptorFromList?.id) {
      return of([]);
    }

    return this.catalogService.getCatalog(descriptorFromList.id).pipe(
      map(catalog => Array.isArray(catalog.owners) ? catalog.owners : []),
      catchError(() => of([]))
    );
  }
}