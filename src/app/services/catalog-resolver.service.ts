import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { CatalogService } from './catalog.service';
import { CatalogDescriptor } from '../openapi';

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
      catchError(error => {
        console.error('Error retrieving catalog descriptors', error);
        return of([]);
      })
    );
  }
}