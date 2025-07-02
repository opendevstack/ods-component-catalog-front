import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { of, Subject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { AzureService } from './services/azure.service';
import { CatalogService } from './services/catalog.service';
import { Catalog, CatalogDescriptor } from './openapi';
import { Router } from '@angular/router';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockAzureService: jasmine.SpyObj<AzureService>;
  let mockCatalogService: jasmine.SpyObj<CatalogService>;
  let catalogDescriptorsSubject = new Subject<CatalogDescriptor[]>();
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAzureService = jasmine.createSpyObj('AzureService', ['initialize', 'login', 'logout'], { loggedUser$: of(null) });
    mockCatalogService = jasmine.createSpyObj('CatalogService', ['retrieveCatalogDescriptors', 'setCatalogDescriptors', 'getCatalogDescriptors', 'getSlugUrl', 'getCatalog']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);

    await TestBed.configureTestingModule({
      imports: [AppComponent, BrowserAnimationsModule],
      providers: [
        { provide: AzureService, useValue: mockAzureService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: Router, useValue: routerSpy },
        provideHttpClient()
      ]
    }).compileComponents();

    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(catalogDescriptorsSubject.asObservable());
    mockCatalogService.getCatalogDescriptors.and.returnValue([{ slug: 'test-catalog', id: '1' }]);
    mockCatalogService.getSlugUrl.and.callFake((slug: string) => slug);
    mockCatalogService.getCatalog.and.returnValue(of({ slug: 'test-catalog', id: '1', links: [] } as Catalog));

    catalogDescriptorsSubject.next([{ slug: 'test-catalog', id: '1' }]);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the service and subscribe to loggedUser$ on ngOnInit', () => {
    component.ngOnInit();
    expect(mockAzureService.initialize).toHaveBeenCalled();
    expect(component.loggedUser).toBeNull();
  });

  it('should call login method of AzureService on login', () => {
    component.login();
    expect(mockAzureService.login).toHaveBeenCalled();
  });

  it('should call logout method of AzureService on logout', () => {
    component.logout();
    expect(mockAzureService.logout).toHaveBeenCalled();
  });

  it('should complete the _destroying$ subject on ngOnDestroy', () => {
    const completeSpy = spyOn(component['_destroying$'], 'complete');
    component.ngOnDestroy();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('should set the catalog shell and navigate to the catalog URL when a valid catalog is picked', () => {
    const mockCatalog = { slug: 'test-catalog', id: '1' };
    mockCatalogService.getCatalogDescriptors.and.returnValue([mockCatalog]);
    spyOn(component, 'setCatalogShell');
  
    component.pickCatalog('test-catalog');
  
    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalog);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/test-catalog']);
  });
  
  it('should not set the catalog shell or navigate if the catalog is not found', () => {
    mockCatalogService.getCatalogDescriptors.and.returnValue([]);
    spyOn(component, 'setCatalogShell');
    
    component.pickCatalog('non-existent-catalog');
  
    expect(component.setCatalogShell).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
  
  it('should set sidenavSections with catalog slug and links', () => {
    const mockCatalog = {
      slug: 'test-catalog',
      id: '1',
      links: [
        { name: 'Link1', url: 'http://example.com/link1' },
        { name: 'Link2', url: 'http://example.com/link2' }
      ]
    } as Catalog;

    mockCatalogService.getCatalog.and.returnValue(of(mockCatalog));

    component.setCatalogShell({ slug: 'test-catalog', id: '1' });

    expect(component.sidenavSections).toEqual([
      {
        label: 'TEST-CATALOG',
        links: [
          { label: 'Our offering', anchor: '/test-catalog', icon: 'bi-house-icon' },
          { label: 'Community', anchor: '/test-catalog/community', icon: 'bi-people-icon' }
        ]
      }
    ]);

    expect(component.sidenavLinks.links).toEqual([
      { label: 'Link1', anchor: 'http://example.com/link1', icon: 'bi-chain-linked-icon', target: '_blank' },
      { label: 'Link2', anchor: 'http://example.com/link2', icon: 'bi-chain-linked-icon', target: '_blank' }
    ]);
  });

  it('should handle catalogs without links gracefully', () => {
    const mockCatalog = {
      slug: 'test-catalog',
      id: '1',
      links: []
    };

    mockCatalogService.getCatalog.and.returnValue(of(mockCatalog));

    component.setCatalogShell(mockCatalog);

    expect(component.sidenavSections).toEqual([
      {
        label: 'TEST-CATALOG',
        links: [
          { label: 'Our offering', anchor: '/test-catalog', icon: 'bi-house-icon' },
          { label: 'Community', anchor: '/test-catalog/community', icon: 'bi-people-icon' }
        ]
      }
    ]);

    expect(component.sidenavLinks.links).toEqual([]);
  });

  it('should not fail if catalog links are undefined', () => {
    const mockCatalog = {
      slug: 'test-catalog',
      id: '1',
      links: undefined
    };

    mockCatalogService.getCatalog.and.returnValue(of(mockCatalog));

    component.setCatalogShell(mockCatalog);

    expect(component.sidenavSections).toEqual([
      {
        label: 'TEST-CATALOG',
        links: [
          { label: 'Our offering', anchor: '/test-catalog', icon: 'bi-house-icon' },
          { label: 'Community', anchor: '/test-catalog/community', icon: 'bi-people-icon' }
        ]
      }
    ]);

    expect(component.sidenavLinks.links).toEqual([]);
  });

  
  it('should set the catalog shell if a catalog segment is found in the current navigation', () => {
    const mockCatalogs = [{ slug: 'catalog-1', id: '1' }];
    routerSpy.getCurrentNavigation.and.returnValue({
      extractedUrl: {
        root: {
          children: {
            primary: {
              segments: [{ path: 'catalog-1' }]
            }
          }
        }
      }
    } as any);
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(of(mockCatalogs));
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'setCatalogShell');

    catalogDescriptorsSubject.next(mockCatalogs);

    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalogs[0]);
  });

  it('should pick the first catalog if no catalog segment is found in the current navigation', () => {
    const mockCatalogs = [{ slug: 'catalog-1', id: '1' }];

    routerSpy.getCurrentNavigation.and.returnValue(null);
    
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(of(mockCatalogs));
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'pickCatalog');

    catalogDescriptorsSubject.next(mockCatalogs);

    expect(component.pickCatalog).toHaveBeenCalledWith('catalog-1');
  });
});