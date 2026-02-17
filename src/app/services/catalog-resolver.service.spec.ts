import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CatalogResolver } from './catalog-resolver.service';
import { CatalogService } from './catalog.service';
import { CatalogDescriptor } from '../openapi/component-catalog';
import { Observable, of } from 'rxjs';

describe('CatalogResolver', () => {
  let service: CatalogResolver;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;

  beforeEach(() => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getCatalogDescriptors', 'retrieveCatalogDescriptors']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: CatalogService, useValue: catalogServiceSpy }
      ]
    });

    service = TestBed.inject(CatalogResolver);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve catalog descriptors calling the service if not present in memory', () => {
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([]);
    catalogServiceSpy.retrieveCatalogDescriptors.and.returnValue(of([{} as CatalogDescriptor]));
    service.resolve();
    expect(catalogServiceSpy.retrieveCatalogDescriptors).toHaveBeenCalled();
  });
  
  it('should resolve catalog descriptors without calling the service if present in memory', () => {
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{} as CatalogDescriptor]);
    service.resolve();
    expect(catalogServiceSpy.retrieveCatalogDescriptors).not.toHaveBeenCalled();
  });
  
  it('should handle errors from retrieveCatalogDescriptors and return empty array', (done) => {
    const error = new Error('Failed to load');
    spyOn(console, 'error');
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([]);
    catalogServiceSpy.retrieveCatalogDescriptors.and.returnValue(
      new Observable<CatalogDescriptor[]>(subscriber => {
        subscriber.error(error);
      })
    );

    service.resolve().subscribe(result => {
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error retrieving catalog descriptors', error);
      done();
    });
  });
});