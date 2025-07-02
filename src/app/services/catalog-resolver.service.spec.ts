import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CatalogResolver } from './catalog-resolver.service';
import { CatalogService } from './catalog.service';
import { CatalogDescriptor } from '../openapi';

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
    service.resolve();
    expect(catalogServiceSpy.retrieveCatalogDescriptors).toHaveBeenCalled();
  });
  
  it('should resolve catalog descriptors without calling the service if present in memory', () => {
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{} as CatalogDescriptor]);
    service.resolve();
    expect(catalogServiceSpy.retrieveCatalogDescriptors).not.toHaveBeenCalled();
  });

});