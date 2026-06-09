import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';
import { CatalogService } from './catalog.service';
import { CatalogDescriptor } from '../openapi/component-catalog';

@Injectable({
  providedIn: 'root'
})
export class CatalogResolver implements Resolve<CatalogDescriptor[]> {
  constructor(private readonly catalogService: CatalogService) {}

  resolve(): Observable<CatalogDescriptor[]> {
    const catalogDescriptors = this.catalogService.getCatalogDescriptors();
    if (catalogDescriptors.length > 0) {
      return of(catalogDescriptors);
    }
    return this.catalogService.retrieveCatalogDescriptors().pipe(
      tap((descriptors) => {
        this.catalogService.setCatalogDescriptors(descriptors);
      }),
      catchError(error => {
        console.error('Error retrieving catalog descriptors', error);
        this.catalogService.setCatalogDescriptors([]);
        return of([]);
      })
    );
  }
}