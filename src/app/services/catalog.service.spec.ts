import { TestBed } from '@angular/core/testing';

import { CatalogService } from './catalog.service';
import { AppShellFilter } from '@appshell/ngx-appshell';
import { BASE_PATH, Catalog, CatalogDescriptor, CatalogDescriptorsService, CatalogDescriptorsServiceInterface, CatalogFiltersService, CatalogFiltersServiceInterface, CatalogItem, CatalogItemFilter, CatalogItemsService, CatalogItemsServiceInterface, CatalogsService, CatalogsServiceInterface, FilesService, FilesServiceInterface } from '../openapi';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { AppProduct } from '../models/app-product';


const currentDate = new Date();

const fakeServiceItems: CatalogItem[] = [
  { id: '1', title: 'Product 1', shortDescription: 'Short description 1', descriptionFileId: 'Description 1', imageFileId: 'image1.jpg', tags: [{label: 'cat1', options: new Set(['tag1'])}], authors: [], date: currentDate.toISOString() },
  { id: '2', title: 'Product 2', shortDescription: 'Short description 2', descriptionFileId: 'Description 2', imageFileId: undefined, tags: [{label: 'cat1'}], authors: ['author2'], date: currentDate.toISOString(), userActions: [{displayName: 'action', id: 'name', triggerMessage: 'fake', url: 'url', parameters: [{name: 'name', label: 'label', required: true, type: 'string', visible: true, defaultValue: 'test', validations: [{regex: '*', errorMessage: 'Error'}]}, {name: 'name 2', label: 'label 2', required: true, type: 'string', visible: true, defaultValue: null, locations: [{location: 'location 1', value: 'test 2'}, {location: 'location 2', value: 'test 22'}]}]}, {displayName: 'action2', id: 'name2', triggerMessage: 'fake2', url: 'url2'}] }
];

const fakeProductsFromItems: AppProduct[] = [
  { id: '1', title: 'Product 1', shortDescription: 'Short description 1', description: 'Description 1', image: '/component-catalog/files/image1.jpg/contents', tags: [{label: 'cat1', options: ['tag1']}], authors: [], date: undefined },
  { id: '2', title: 'Product 2', shortDescription: 'Short description 2', description: 'Description 2', image: undefined, tags: [{label: 'cat1', options: []}], authors: ['author2'], date: currentDate, actions: [{label: 'action', id: 'name', triggerMessage: 'fake', url: 'url', parameters: [{name: 'name', label: 'label', required: true, type: 'string', visible: true, defaultValue: 'test', validations: [{regex: '*', errorMessage: 'Error'}]}, {name: 'name 2', label: 'label 2', required: true, type: 'string', visible: true, defaultValue: null, locations: [{location: 'location 1', value: 'test 2'}, {location: 'location 2', value: 'test 22'}]}]}, {label: 'action2', id: 'name2', triggerMessage: 'fake2', url: 'url2', parameters: []}] }
];

describe('CatalogService', () => {
  let service: CatalogService;
  let catalogItemsServiceSpy: jasmine.SpyObj<CatalogItemsServiceInterface>;
  let catalogFiltersServiceSpy: jasmine.SpyObj<CatalogFiltersServiceInterface>;
  let filesServiceSpy: jasmine.SpyObj<FilesServiceInterface>;
  let catalogsServiceSpy: jasmine.SpyObj<CatalogsServiceInterface>;
  let catalogDescriptorsServiceSpy: jasmine.SpyObj<CatalogDescriptorsServiceInterface>;

  beforeEach(() => {
    catalogItemsServiceSpy = jasmine.createSpyObj('CatalogItemsService', ['getCatalogItems', 'getCatalogItemById']);
    catalogFiltersServiceSpy = jasmine.createSpyObj('CatalogFiltersService', ['getCatalogFilters']);
    filesServiceSpy = jasmine.createSpyObj('FilesService', ['getFileById']);
    catalogsServiceSpy = jasmine.createSpyObj('CatalogsService', ['getCatalog']);
    catalogDescriptorsServiceSpy = jasmine.createSpyObj('CatalogDescriptorsService', ['getCatalogDescriptors']);

    TestBed.configureTestingModule({
      providers: [
        CatalogService,
        { provide: CatalogItemsService, useValue: catalogItemsServiceSpy },
        { provide: CatalogFiltersService, useValue: catalogFiltersServiceSpy },
        { provide: FilesService, useValue: filesServiceSpy },
        { provide: CatalogsService, useValue: catalogsServiceSpy },
        { provide: CatalogDescriptorsService, useValue: catalogDescriptorsServiceSpy },
        { provide: BASE_PATH, useValue: '/component-catalog' },
        provideHttpClient()
      ]
    });

    service = TestBed.inject(CatalogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getProductsList should return the list of products', (done) => {
    const serviceItems: CatalogItem[] = fakeServiceItems;
    const expectedProducts: AppProduct[] = fakeProductsFromItems;
    const catalogDescriptor = { id: '1', slug: 'catalog1' };

    catalogItemsServiceSpy.getCatalogItems.and.returnValue(of(serviceItems));
    filesServiceSpy.getFileById.and.returnValues(of('img'));

    service.getProductsList(catalogDescriptor).subscribe(products => {
      for(let i=0; i<products.length; i++) {
        const product = products[i];
        const expectedProduct = expectedProducts[i];
        expect(product.authors).toEqual(expectedProduct.authors);
        expect(product.date).toEqual(expectedProduct.date);
        expect(product.description).toEqual(expectedProduct.description);
        expect(product.id).toEqual(expectedProduct.id);
        if(expectedProduct.image) {
          expect(product.image).toContain('blob');
        } else {
          expect(product.image).toBeUndefined();
        }
        expect(product.shortDescription).toEqual(expectedProduct.shortDescription);
        expect(product.tags).toEqual(expectedProduct.tags);
        expect(product.title).toEqual(expectedProduct.title);
      }
      done();
    });
  });

  it('getProduct should return a single product', (done) => {
    const serviceItem: CatalogItem = fakeServiceItems[0];
    const expectedProduct: AppProduct = fakeProductsFromItems[0];
    
    catalogItemsServiceSpy.getCatalogItemById.and.returnValue(of(serviceItem));
    filesServiceSpy.getFileById.and.returnValue(of(expectedProduct.description));

    service.getProduct(expectedProduct.id).subscribe(product => {
      expect(product.authors).toEqual(expectedProduct.authors);
      expect(product.date).toEqual(expectedProduct.date);
      expect(product.description).toEqual(expectedProduct.description);
      expect(product.id).toEqual(expectedProduct.id);
      expect(product.image).toContain('blob');
      expect(product.shortDescription).toEqual(expectedProduct.shortDescription);
      expect(product.tags).toEqual(expectedProduct.tags);
      expect(product.title).toEqual(expectedProduct.title);
      done();
    });
  });

  it('getProduct should return an empty description if file returns 422', (done) => {
    const serviceItem: CatalogItem = {...fakeServiceItems[0]};
    serviceItem.imageFileId = undefined;
    const expectedProduct: AppProduct = fakeProductsFromItems[0];
    
    catalogItemsServiceSpy.getCatalogItemById.and.returnValue(of(serviceItem));
    const error: Error & { status?: number } = new Error('Error loading file');
    error.status = 422;
    filesServiceSpy.getFileById.and.throwError(error);

    service.getProduct(expectedProduct.id).subscribe(product => {
      expect(product.authors).toEqual(expectedProduct.authors);
      expect(product.date).toEqual(expectedProduct.date);
      expect(product.description).toEqual('');
      expect(product.id).toEqual(expectedProduct.id);
      expect(product.image).toBeUndefined();
      expect(product.shortDescription).toEqual(expectedProduct.shortDescription);
      expect(product.tags).toEqual(expectedProduct.tags);
      expect(product.title).toEqual(expectedProduct.title);
      done();
    });
  });

  it('getProduct should fail if file returns error different than 422', (done) => {
    const serviceItem: CatalogItem = fakeServiceItems[0];
    const expectedProduct: AppProduct = fakeProductsFromItems[0];
    
    catalogItemsServiceSpy.getCatalogItemById.and.returnValue(of(serviceItem));
    filesServiceSpy.getFileById.and.returnValue(throwError(() => {
      const error: Error & { status?: number } = new Error('Error loading file');
      error.status = 404;
      return error;
    }));

    service.getProduct(expectedProduct.id).subscribe({
      next: () => {
        fail('expected an error, not product');
        done();
      },
      error: (error) => {
        expect(error.status).toBe(404);
        done();
      }
    });
  });
  
  it('getProduct should return a single product even without image', (done) => {
    const serviceItem: CatalogItem = fakeServiceItems[1];
    const expectedProduct: AppProduct = fakeProductsFromItems[1];
    
    catalogItemsServiceSpy.getCatalogItemById.and.returnValue(of(serviceItem));
    filesServiceSpy.getFileById.and.returnValue(of(expectedProduct.description));

    service.getProduct(expectedProduct.id).subscribe(product => {
      expect(product.authors).toEqual(expectedProduct.authors);
      expect(product.date).toEqual(expectedProduct.date);
      expect(product.description).toEqual(expectedProduct.description);
      expect(product.id).toEqual(expectedProduct.id);
      expect(product.image).toBeUndefined();
      expect(product.shortDescription).toEqual(expectedProduct.shortDescription);
      expect(product.tags).toEqual(expectedProduct.tags);
      expect(product.title).toEqual(expectedProduct.title);
      done();
    });
  });

  it('getFilters should return the filters', (done) => {
    const serviceFilters: CatalogItemFilter[] = [{ label: 'cat1', options: new Set(['tag2', 'tag1']) }, { label: 'cat2' }];
    const expectedFilters: AppShellFilter[] = [{ label: 'cat1', options: ['tag1', 'tag2'], placeholder: 'Select options' }, { label: 'cat2', options: [], placeholder: 'Select options' }];
    
    catalogFiltersServiceSpy.getCatalogFilters.and.returnValue(of(serviceFilters));

    service.getFilters('fakeId').subscribe(filters => {
      expect(JSON.stringify(filters)).toEqual(JSON.stringify(expectedFilters));
      done();
    });
  });

  it('getProductImage should return a blob URL if the file is retrieved successfully', async () => {
    const imageFileId = 'image1.jpg';
    const fakeBlob = new Blob(['fake image content'], { type: 'image/jpeg' });
    const fakeBlobUrl = URL.createObjectURL(fakeBlob);

    spyOn(URL, 'createObjectURL').and.returnValue(fakeBlobUrl);
    filesServiceSpy.getFileById.and.returnValue(of('fake image content'));

    let result = await service.getProductImage(imageFileId);
    expect(result).toContain('blob:http');
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    filesServiceSpy.getFileById.and.returnValue(of(fakeBlob) as any); // Simulate the file retrieval returning a Blob directly

    result = await service.getProductImage(imageFileId);
    expect(result).toContain('blob:http');
  });

  it('getProductImage should return undefined if the file retrieval throws an error', async () => {
    const imageFileId = 'image1.jpg';
    const error: Error & { status?: number } = new Error('Error loading file');

    filesServiceSpy.getFileById.and.returnValue(throwError(() => error));

    const result = await service.getProductImage(imageFileId);
    expect(result).toBeUndefined();
  });

  it('getCatalogDescriptors should return the catalog descriptors', () => {
    const mockCatalogDescriptors = [
      { id: '1', slug: 'catalog1' },
      { id: '2', slug: 'catalog2' }
    ];

    service.setCatalogDescriptors(mockCatalogDescriptors);

    const result = service.getCatalogDescriptors();
    expect(result).toEqual(mockCatalogDescriptors);
  });

  it('setCatalogDescriptors should set the catalog descriptors', () => {
    const mockCatalogDescriptors = [
      { id: '1', slug: 'catalog1' },
      { id: '2', slug: 'catalog2' }
    ];
  
    service.setCatalogDescriptors(mockCatalogDescriptors);
  
    expect(service.getCatalogDescriptors()).toEqual(mockCatalogDescriptors);
  });
  
  it('setCatalogDescriptors should overwrite existing catalog descriptors', () => {
    const initialCatalogDescriptors = [
      { id: '1', slug: 'catalog1' }
    ];
    const newCatalogDescriptors = [
      { id: '2', slug: 'catalog2' },
      { id: '3', slug: 'catalog3' }
    ];
  
    service.setCatalogDescriptors(initialCatalogDescriptors);
    expect(service.getCatalogDescriptors()).toEqual(initialCatalogDescriptors);
  
    service.setCatalogDescriptors(newCatalogDescriptors);
    expect(service.getCatalogDescriptors()).toEqual(newCatalogDescriptors);
  });
  
  it('setCatalogDescriptors should handle an empty array', () => {
    const emptyCatalogDescriptors: CatalogDescriptor[] = [];
  
    service.setCatalogDescriptors(emptyCatalogDescriptors);
  
    expect(service.getCatalogDescriptors()).toEqual(emptyCatalogDescriptors);
  });

  it('getCatalog should return the catalog for a given catalogId', (done) => {
    const catalogId = '1';
    const mockCatalog: Catalog = {
      name: 'Test Catalog',
      description: 'This is a test catalog',
      communityPageId: 'path',
      links: [],
      tags: []
    };

    catalogsServiceSpy.getCatalog.and.returnValue(of(mockCatalog));

    service.getCatalog(catalogId).subscribe(catalog => {
      expect(catalog).toEqual(mockCatalog);
      done();
    });
  });

  it('getCatalog should handle errors when retrieving a catalog', (done) => {
    const catalogId = '1';
    const error: Error & { status?: number } = new Error('Error retrieving catalog');
    error.status = 404;

    catalogsServiceSpy.getCatalog.and.returnValue(throwError(() => error));

    service.getCatalog(catalogId).subscribe({
      next: () => {
        fail('expected an error, not a catalog');
        done();
      },
      error: (err) => {
        expect(err.status).toBe(404);
        done();
      }
    });
  });

  it('retrieveCatalogDescriptors should return catalog descriptors', (done) => {
    const mockCatalogDescriptors: CatalogDescriptor[] = [
      { id: '1', slug: 'catalog1' },
      { id: '2', slug: 'catalog2' }
    ];

    catalogDescriptorsServiceSpy.getCatalogDescriptors.and.returnValue(of(mockCatalogDescriptors));

    service.retrieveCatalogDescriptors().subscribe(descriptors => {
      expect(descriptors).toEqual(mockCatalogDescriptors);
      done();
    });
  });

  it('retrieveCatalogDescriptors should handle errors when retrieving catalog descriptors', (done) => {
    const error: Error & { status?: number } = new Error('Error retrieving catalog descriptors');
    error.status = 500;

    catalogDescriptorsServiceSpy.getCatalogDescriptors.and.returnValue(throwError(() => error));

    service.retrieveCatalogDescriptors().subscribe({
      next: () => {
        fail('expected an error, not catalog descriptors');
        done();
      },
      error: (err) => {
        expect(err.status).toBe(500);
        done();
      }
    });
  });

  it('getSlugUrl should return the correct slug URL', () => {
    expect(service.getSlugUrl('test-slug')).toEqual('test-slug');
    expect(service.getSlugUrl('Test Slug')).toEqual('test-slug');
    expect(service.getSlugUrl('test--slug')).toEqual('test-slug');
    expect(service.getSlugUrl('test  slug')).toEqual('test-slug');
  });

});