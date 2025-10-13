import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCatalogScreenComponent } from './product-catalog-screen.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CatalogService } from '../../services/catalog.service';
import { provideHttpClient } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AppProduct } from '../../models/app-product';

describe('ProductCatalogScreenComponent', () => {
  let component: ProductCatalogScreenComponent;
  let fixture: ComponentFixture<ProductCatalogScreenComponent>;
  let mockCatalogService: jasmine.SpyObj<CatalogService>;
  let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
  let routerSpy: jasmine.SpyObj<Router>;
  const activatedRouteSubject = new Subject();

  beforeEach(async () => {
    mockCatalogService = jasmine.createSpyObj('CatalogService', ['getProductsList', 'getFilters', 'getCatalogDescriptors', 'getSlugUrl']);
    activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {'params': activatedRouteSubject});
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ProductCatalogScreenComponent],
      providers: [
        { provide: CatalogService, useValue: mockCatalogService },
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: Router, useValue: routerSpy },
      ]
    })
    .compileComponents();

    mockCatalogService.getProductsList.and.returnValue(of([]));
    mockCatalogService.getFilters.and.returnValue(of([]));
    mockCatalogService.getCatalogDescriptors.and.returnValue([{slug: 'catalog', id: 'fake'}]);
    mockCatalogService.getSlugUrl.and.callFake((id: string) => {return id;});

    fixture = TestBed.createComponent(ProductCatalogScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    activatedRouteSubject.next({'catalogSlug': 'catalog'});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return all products if there are no active filters', () => {
    const activeFilters = new Map();
    const products = [
      { tags: [{ label: 'label 1', options: ['value 1']}] },
      { tags: [{ label: 'label 2', options: ['value 2']}] }
    ] as AppProduct[];
    component.products = [...products];
    component.filterProducts(activeFilters);
    expect(component.filteredProducts).toEqual(products);
  });

  it('should filter products based on active filters', () => {
    const products = [
      { 
        id: '1',
        title: 'Product 1',
        shortDescription: 'Short 1',
        description: 'Desc 1',
        image: 'Img 1',
        authors: [],
        date: new Date(),
        tags: [{ label: 'label 1', options: ['value 1']}]
      },
      { 
        id: '2',
        title: 'Product 2',
        shortDescription: 'Short 2',
        description: 'Desc 2',
        image: 'Img 2',
        authors: [],
        date: new Date(),
        tags: [{ label: 'label 2', options: ['value 2']}]
      }
    ] as AppProduct[];

    const activeFilters = new Map();
    activeFilters.set('label 1', ['value 1']);
    component.products = products;

    component.filterProducts(activeFilters);

    expect(component.filteredProducts).toEqual([products[0]]);
  });

  it('should return an empty array if no products match the active filters', () => {
    const activeFilters = new Map();
    activeFilters.set('label 1', ['value 3']);
    component.products = [
      { tags: [{ label: 'label 1', options: ['value 1']}] },
      { tags: [{ label: 'label 2', options: ['value 2']}] },
    ] as AppProduct[];

    component.filterProducts(activeFilters);

    expect(component.filteredProducts).toEqual([]);
  });

  it('should return false for products without labels', () => {
    const activeFilters = new Map();
    activeFilters.set('label 1', ['value 1']);
    
    const products = [
      { 
        id: '1',
        title: 'Product 1',
        shortDescription: 'Short 1',
        description: 'Desc 1',
        image: 'Img 1',
        authors: [],
        date: new Date(),
        tags: [{ label: 'label 1', options: ['value 1']}]
      },
      { 
        id: '2',
        title: 'Product 2',
        shortDescription: 'Short 2',
        description: 'Desc 2',
        image: 'Img 2',
        authors: [],
        date: new Date(),
        tags: null
      }
    ] as AppProduct[];

    component.products = products;

    component.filterProducts(activeFilters);

    expect(component.filteredProducts).toEqual([products[0]]);
  });

  it('should set the proper message if the call to retrieve the products fails', () => {
    mockCatalogService.getProductsList.and.returnValue(throwError(() => new Error('test')));
    activatedRouteSubject.next({'catalogSlug': 'catalog'});
    expect(component.noProductsIcon).toEqual('bi-smiley-sad-icon');
    expect(component.noProductsHtmlMessage).toEqual('Sorry, we are having trouble loading the results.<br/> Please check back in a few minutes.');
  });

  it('should redirect to / if there is no valid catalog in the route params', () => {
    activatedRouteSubject.next({});
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });
});