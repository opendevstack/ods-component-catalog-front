import { TestBed } from '@angular/core/testing';

import { CatalogService } from './catalog.service';
import { AppShellFilter, AppShellProduct } from '@appshell/ngx-appshell';
import { BASE_PATH, CatalogFiltersService, CatalogFiltersServiceInterface, CatalogItem, CatalogItemFilter, CatalogItemsService, CatalogItemsServiceInterface, FilesService, FilesServiceInterface } from '../openapi';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';


const currentDate = new Date();

const fakeServiceItems: CatalogItem[] = [
  { id: '1', title: 'Product 1', shortDescription: 'Short description 1', descriptionFileId: 'Description 1', imageFileId: 'image1.jpg', itemSrc: 'link1', tags: [{label: 'cat1', options: new Set(['tag1'])}], authors: ['author1'], date: currentDate.toISOString() },
  { id: '2', title: 'Product 2', shortDescription: 'Short description 2', descriptionFileId: 'Description 2', imageFileId: undefined, itemSrc: 'link2', tags: [{label: 'cat1'}], authors: ['author2'], date: currentDate.toISOString() }
];

const fakeProductsFromItems: AppShellProduct[] = [
  { id: '1', title: 'Product 1', shortDescription: 'Short description 1', description: 'Description 1', image: '/component-catalog/files/image1.jpg/contents', link: 'link1', tags: [{label: 'cat1', options: ['tag1']}], authors: ['author1'], date: currentDate },
  { id: '2', title: 'Product 2', shortDescription: 'Short description 2', description: 'Description 2', image: undefined, link: 'link2', tags: [{label: 'cat1', options: []}], authors: ['author2'], date: currentDate }
];

describe('CatalogService', () => {
  let service: CatalogService;
  let catalogItemsServiceSpy: jasmine.SpyObj<CatalogItemsServiceInterface>;
  let catalogFiltersServiceSpy: jasmine.SpyObj<CatalogFiltersServiceInterface>;
  let filesServiceSpy: jasmine.SpyObj<FilesServiceInterface>;

  beforeEach(() => {
    catalogItemsServiceSpy = jasmine.createSpyObj('CatalogItemsService', ['getCatalogItems', 'getCatalogItemById']);
    catalogFiltersServiceSpy = jasmine.createSpyObj('CatalogFiltersService', ['getCatalogFilters']);
    filesServiceSpy = jasmine.createSpyObj('FilesService', ['getFileById']);

    TestBed.configureTestingModule({
      providers: [
        CatalogService,
        { provide: CatalogItemsService, useValue: catalogItemsServiceSpy },
        { provide: CatalogFiltersService, useValue: catalogFiltersServiceSpy },
        { provide: FilesService, useValue: filesServiceSpy },
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
    const expectedProducts: AppShellProduct[] = fakeProductsFromItems;

    catalogItemsServiceSpy.getCatalogItems.and.returnValue(of(serviceItems));
    filesServiceSpy.getFileById.and.returnValues(of('img'));

    service.getProductsList().subscribe(products => {
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
        expect(product.link).toEqual(expectedProduct.link);
        expect(product.shortDescription).toEqual(expectedProduct.shortDescription);
        expect(product.tags).toEqual(expectedProduct.tags);
        expect(product.title).toEqual(expectedProduct.title);
      }
      done();
    });
  });

  it('getProduct should return a single product', (done) => {
    const serviceItem: CatalogItem = fakeServiceItems[0];
    const expectedProduct: AppShellProduct = fakeProductsFromItems[0];
    
    catalogItemsServiceSpy.getCatalogItemById.and.returnValue(of(serviceItem));
    filesServiceSpy.getFileById.and.returnValue(of(expectedProduct.description));

    service.getProduct(expectedProduct.id).subscribe(product => {
      expect(product.authors).toEqual(expectedProduct.authors);
      expect(product.date).toEqual(expectedProduct.date);
      expect(product.description).toEqual(expectedProduct.description);
      expect(product.id).toEqual(expectedProduct.id);
      expect(product.image).toContain('blob');
      expect(product.link).toEqual(expectedProduct.link);
      expect(product.shortDescription).toEqual(expectedProduct.shortDescription);
      expect(product.tags).toEqual(expectedProduct.tags);
      expect(product.title).toEqual(expectedProduct.title);
      done();
    });
  });

  it('getProduct should return an empty description if file returns 422', (done) => {
    const serviceItem: CatalogItem = {...fakeServiceItems[0]};
    serviceItem.imageFileId = undefined;
    const expectedProduct: AppShellProduct = fakeProductsFromItems[0];
    
    catalogItemsServiceSpy.getCatalogItemById.and.returnValue(of(serviceItem));
    const error: any = new Error('Error loading file');
    error.status = 422;
    filesServiceSpy.getFileById.and.throwError(error);

    service.getProduct(expectedProduct.id).subscribe(product => {
      expect(product.authors).toEqual(expectedProduct.authors);
      expect(product.date).toEqual(expectedProduct.date);
      expect(product.description).toEqual('');
      expect(product.id).toEqual(expectedProduct.id);
      expect(product.image).toBeUndefined();
      expect(product.link).toEqual(expectedProduct.link);
      expect(product.shortDescription).toEqual(expectedProduct.shortDescription);
      expect(product.tags).toEqual(expectedProduct.tags);
      expect(product.title).toEqual(expectedProduct.title);
      done();
    });
  });

  it('getProduct should fail if file returns error different than 422', (done) => {
    const serviceItem: CatalogItem = fakeServiceItems[0];
    const expectedProduct: AppShellProduct = fakeProductsFromItems[0];
    
    catalogItemsServiceSpy.getCatalogItemById.and.returnValue(of(serviceItem));
    filesServiceSpy.getFileById.and.returnValue(throwError(() => {
      const error: any = new Error('Error loading file');
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
    const expectedProduct: AppShellProduct = fakeProductsFromItems[1];
    
    catalogItemsServiceSpy.getCatalogItemById.and.returnValue(of(serviceItem));
    filesServiceSpy.getFileById.and.returnValue(of(expectedProduct.description));

    service.getProduct(expectedProduct.id).subscribe(product => {
      expect(product.authors).toEqual(expectedProduct.authors);
      expect(product.date).toEqual(expectedProduct.date);
      expect(product.description).toEqual(expectedProduct.description);
      expect(product.id).toEqual(expectedProduct.id);
      expect(product.image).toBeUndefined();
      expect(product.link).toEqual(expectedProduct.link);
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

    service.getFilters().subscribe(filters => {
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

    const result = await service.getProductImage(imageFileId);
    expect(result).toContain('blob');
  });

  it('getProductImage should return undefined if the file retrieval throws an error', async () => {
    const imageFileId = 'image1.jpg';
    const error: any = new Error('Error loading file');

    filesServiceSpy.getFileById.and.returnValue(throwError(() => error));

    const result = await service.getProductImage(imageFileId);
    expect(result).toBeUndefined();
  });

});
