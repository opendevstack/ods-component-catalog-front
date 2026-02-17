import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCatalogScreenComponent } from './product-catalog-screen.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CatalogService } from '../../services/catalog.service';
import { provideHttpClient } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AppProduct } from '../../models/app-product';
import { ProjectService } from '../../services/project.service';
import { AppProject } from '../../models/project';
import { AppShellFilter } from '@opendevstack/ngx-appshell';

describe('ProductCatalogScreenComponent', () => {
  let component: ProductCatalogScreenComponent;
  let fixture: ComponentFixture<ProductCatalogScreenComponent>;
  let mockCatalogService: jasmine.SpyObj<CatalogService>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteSubject: Subject<Record<string, unknown>>;
  let projectSubject: Subject<AppProject>;

  beforeEach(async () => {
    activatedRouteSubject = new Subject<Record<string, unknown>>();
    projectSubject = new Subject<AppProject>();

    mockCatalogService = jasmine.createSpyObj('CatalogService', ['getProductsList', 'getFilters', 'getCatalogDescriptors', 'getSlugUrl', 'getProjectProductsList', 'setSelectedCatalogSlug', 'getSelectedCatalogSlug']);
    mockProjectService = jasmine.createSpyObj('ProjectService', ['getCurrentProject'], { project$: projectSubject.asObservable() });
    activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], { 'params': activatedRouteSubject.asObservable() });
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ProductCatalogScreenComponent],
      providers: [
        { provide: CatalogService, useValue: mockCatalogService },
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ProjectService, useValue: mockProjectService }
      ]
    })
    .compileComponents();

    mockCatalogService.getProductsList.and.returnValue(of([]));
    mockCatalogService.getFilters.and.returnValue(of([]));
    mockCatalogService.getCatalogDescriptors.and.returnValue([{slug: 'catalog', id: 'fake'}]);
    mockCatalogService.getSlugUrl.and.callFake((id: string) => {return id;});
    mockCatalogService.getSelectedCatalogSlug.and.returnValue(null);

    fixture = TestBed.createComponent(ProductCatalogScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    activatedRouteSubject.complete();
    projectSubject.complete();
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
    expect(component.noProductsIcon).toEqual('magnifying_glass');
    expect(component.noProductsHtmlMessage).toEqual('<b>NO RESULTS.</b><br/>Adjust your filters to see more options.');
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

  it('should return an empty array when product is missing a filtered tag label', () => {
    const activeFilters = new Map();
    activeFilters.set('label 3', ['value 3']);
    component.products = [
      { tags: [{ label: 'label 1', options: ['value 1'] }] },
      { tags: [{ label: 'label 2', options: ['value 2'] }] },
    ] as AppProduct[];

    component.filterProducts(activeFilters);

    expect(component.filteredProducts).toEqual([]);
    expect(component.noProductsIcon).toEqual('magnifying_glass');
  });

  it('should require all filter keys to match', () => {
    const activeFilters = new Map<string, string[]>();
    activeFilters.set('label 1', ['value 1']);
    activeFilters.set('label 2', ['value 2']);

    const products = [
      { tags: [
        { label: 'label 1', options: ['value 1'] },
        { label: 'label 2', options: ['value 2'] },
      ] },
      { tags: [
        { label: 'label 1', options: ['value 1'] },
      ] },
    ] as AppProduct[];

    component.products = products;
    component.filterProducts(activeFilters);
    expect(component.filteredProducts).toEqual([products[0]]);
  });

  it('should set the proper message if the call to retrieve the products fails', () => {
    mockCatalogService.getProductsList.and.returnValue(throwError(() => new Error('test')));
    activatedRouteSubject.next({'catalogSlug': 'catalog'});
    expect(component.noProductsIcon).toEqual('smiley_sad');
    expect(component.noProductsHtmlMessage).toEqual('Sorry, we are having trouble loading the results.<br/> Please check back in a few minutes.');
  });

  it('should set the proper message when the products list is empty (success path)', () => {
    mockProjectService.getCurrentProject.and.returnValue(null);
    mockCatalogService.getProductsList.and.returnValue(of([]));
    activatedRouteSubject.next({ 'catalogSlug': 'catalog' });

    expect(component.noProductsIcon).toEqual('smiley_sad');
    expect(component.noProductsHtmlMessage).toContain('trouble loading');
  });

  it('should load products and run initial filtering when products are returned', () => {
    const products = [
      { id: '1', title: 'P1', tags: [{ label: 'label 1', options: ['value 1'] }] },
    ] as unknown as AppProduct[];

    mockProjectService.getCurrentProject.and.returnValue(null);
    mockCatalogService.getProductsList.and.returnValue(of(products));
    const filterSpy = spyOn(component, 'filterProducts').and.callThrough();

    activatedRouteSubject.next({ 'catalogSlug': 'catalog' });

    expect(component.products).toEqual(products);
    expect(filterSpy).toHaveBeenCalled();
    expect(component.noProductsIcon).toBeUndefined();
  });

  it('should redirect to default catalog if there is no valid catalog in the route params', () => {
    activatedRouteSubject.next({});
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/catalog']);
  });

  it('should prefer selected catalog slug when route param is missing', () => {
    mockCatalogService.getSelectedCatalogSlug.and.returnValue('preferred');
    activatedRouteSubject.next({});

    expect(mockCatalogService.setSelectedCatalogSlug).toHaveBeenCalledWith('preferred');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/preferred']);
  });

  it('should not navigate when there is no route slug, no selected slug, and no catalogs', () => {
    routerSpy.navigate.calls.reset();
    mockCatalogService.getSelectedCatalogSlug.and.returnValue(null);
    mockCatalogService.getCatalogDescriptors.and.returnValue([]);

    activatedRouteSubject.next({});

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to root when catalog slug is not found in descriptors', () => {
    mockCatalogService.getCatalogDescriptors.and.returnValue([{ slug: 'other', id: 'fake' }]);
    activatedRouteSubject.next({ 'catalogSlug': 'missing' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/page-not-found']);
  });
  
  it('should call getProductsList when current project is null', () => {
    mockCatalogService.getProductsList.calls.reset();
    mockCatalogService.getProjectProductsList.calls.reset();
    mockProjectService.getCurrentProject.and.returnValue(null);
    const catalogDescriptor = { slug: 'test-catalog', id: 'test-id' };
    mockCatalogService.getCatalogDescriptors.and.returnValue([catalogDescriptor]);
    mockCatalogService.getProductsList.and.returnValue(of([]));
    mockCatalogService.getFilters.and.returnValue(of([]));

    activatedRouteSubject.next({ 'catalogSlug': 'test-catalog' });

    expect(mockCatalogService.getProductsList).toHaveBeenCalledWith(catalogDescriptor);
    expect(mockCatalogService.getProjectProductsList).not.toHaveBeenCalled();
  });

  it('should call getProjectProductsList when current project is not null', () => {
    mockCatalogService.getProductsList.calls.reset();
    mockCatalogService.getProjectProductsList.calls.reset();
    const mockProject = { projectKey: 'test-project-key' } as AppProject;
    mockProjectService.getCurrentProject.and.returnValue(mockProject);
    mockCatalogService.getProjectProductsList.and.returnValue(of([]));
    const catalogDescriptor = { slug: 'test-catalog', id: 'test-id' };
    mockCatalogService.getCatalogDescriptors.and.returnValue([catalogDescriptor]);
    mockCatalogService.getFilters.and.returnValue(of([]));

    activatedRouteSubject.next({ 'catalogSlug': 'test-catalog' });

    expect(mockCatalogService.getProjectProductsList).toHaveBeenCalledWith('test-project-key', catalogDescriptor);
    expect(mockCatalogService.getProductsList).not.toHaveBeenCalled();
  });

  it('should set breadcrumb links based on catalog slug', () => {
    mockCatalogService.getProductsList.calls.reset();
    mockCatalogService.getProjectProductsList.calls.reset();
    const catalogDescriptor = { slug: 'my-catalog', id: 'catalog-id' };
    mockCatalogService.getCatalogDescriptors.and.returnValue([catalogDescriptor]);
    mockCatalogService.getProductsList.and.returnValue(of([]));
    mockCatalogService.getFilters.and.returnValue(of([]));
    mockProjectService.getCurrentProject.and.returnValue(null);

    activatedRouteSubject.next({ 'catalogSlug': 'my-catalog' });

    expect(component.breadcrumbLinks).toEqual([
      { anchor: '', label: 'Catalog my-catalog' },
      { anchor: '', label: 'Add Components' }
    ]);
  });

  it('should include project breadcrumb when current project exists', () => {
    const mockProject = { projectKey: 'ABC' } as AppProject;
    mockProjectService.getCurrentProject.and.returnValue(mockProject);
    mockCatalogService.getProjectProductsList.and.returnValue(of([]));

    activatedRouteSubject.next({ 'catalogSlug': 'catalog' });

    expect(component.breadcrumbLinks[0]).toEqual({ anchor: '', label: 'Project ABC' });
  });

  it('should load filters for the selected catalog', () => {
    const filters = [{ id: 'f1', label: 'Filter 1', options: [] }] as unknown as AppShellFilter[];
    mockCatalogService.getFilters.and.returnValue(of(filters));
    activatedRouteSubject.next({ 'catalogSlug': 'catalog' });

    expect(component.filters).toEqual(filters);
  });

  it('should reload products and breadcrumbs on project change when a catalog is selected', () => {
    const loadProductsSpy = spyOn<any>(component, 'loadProducts').and.callThrough();
    const setupBreadcrumbsSpy = spyOn<any>(component, 'setupBreadcrumbs').and.callThrough();

    activatedRouteSubject.next({ 'catalogSlug': 'catalog' });
    loadProductsSpy.calls.reset();
    setupBreadcrumbsSpy.calls.reset();

    projectSubject.next({ projectKey: 'project 2' } as AppProject);

    expect(loadProductsSpy).toHaveBeenCalled();
    expect(setupBreadcrumbsSpy).toHaveBeenCalled();
  });

  it('should not reload on project change when no catalog is selected', () => {
    const loadProductsSpy = spyOn<any>(component, 'loadProducts');
    const setupBreadcrumbsSpy = spyOn<any>(component, 'setupBreadcrumbs');

    projectSubject.next({ projectKey: 'project 2' } as AppProject);

    expect(loadProductsSpy).not.toHaveBeenCalled();
    expect(setupBreadcrumbsSpy).not.toHaveBeenCalled();
  });

  it('should clean up on destroy', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});