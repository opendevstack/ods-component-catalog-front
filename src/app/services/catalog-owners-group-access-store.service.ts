import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { CatalogService } from './catalog.service';

@Injectable({ providedIn: 'root' })
export class CatalogOwnersGroupAccessStore {
  private currentOwnersSubject = new BehaviorSubject<string[]>([]);
  public currentOwners$ = this.currentOwnersSubject.asObservable();

  constructor(private catalogService: CatalogService) {
    this.catalogService.selectedCatalogSlug$
      .pipe(
        //distinctUntilChanged(),
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
    if (descriptor && Array.isArray((descriptor as any).owners)) {
      return of((descriptor as any).owners);
    }

    const descriptorFromList = this.catalogService.getCatalogDescriptors()
      .find(c => this.catalogService.getSlugUrl(c.slug!) === slug);

    if (!descriptorFromList?.id) {
      return of([]);
    }

    return this.catalogService.getCatalog(descriptorFromList.id).pipe(
      map(catalog => Array.isArray((catalog as any).owners) ? (catalog as any).owners : []),
      catchError(() => of([]))
    );
  }
}