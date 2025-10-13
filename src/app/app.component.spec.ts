import { AppShellToastsComponent, AppShellToastService } from '@appshell/ngx-appshell'
import { NatsMessage, NatsService } from './services/nats.service'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { of, Subject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { AzureService } from './services/azure.service';
import { CatalogService } from './services/catalog.service';
import { Catalog, CatalogDescriptor } from './openapi';
import { Navigation, Router } from '@angular/router';
import { AppConfigService } from './services/app-config.service';
import { AppUser } from './models/app-user';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockAzureService: jasmine.SpyObj<AzureService>;
  let mockCatalogService: jasmine.SpyObj<CatalogService>;
  const catalogDescriptorsSubject = new Subject<CatalogDescriptor[]>();
  let routerSpy: jasmine.SpyObj<Router>;
  let mockNatsService: jasmine.SpyObj<NatsService>;
  let mockToastService: jasmine.SpyObj<AppShellToastService>;
  let mockAppConfigService: jasmine.SpyObj<AppConfigService>;
  let azureLoggedUser$: Subject<AppUser>;
  let natsLiveMessage$: Subject<NatsMessage | null>;
  let natsMessageCount$: Subject<number>;

  beforeEach(async () => {
    azureLoggedUser$ = new Subject<AppUser>();
    natsLiveMessage$ = new Subject<NatsMessage | null>();
    natsMessageCount$ = new Subject<number>();
    mockAzureService = jasmine.createSpyObj('AzureService', ['initialize', 'login', 'logout'], { loggedUser$: azureLoggedUser$.asObservable() });
    mockNatsService = jasmine.createSpyObj('NatsService', ['initialize', 'initializeUser', 'readMessages', 'isValidMessage'], { liveMessage$: natsLiveMessage$.asObservable(), unreadMessagesCount$: natsMessageCount$.asObservable() });
    mockToastService = jasmine.createSpyObj('AppShellToastService', ['showToast'], { toasts$: of([]) });
    mockCatalogService = jasmine.createSpyObj('CatalogService', ['retrieveCatalogDescriptors', 'setCatalogDescriptors', 'getCatalogDescriptors', 'getSlugUrl', 'getCatalog']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);
    mockAppConfigService = jasmine.createSpyObj('AppConfigService', ['getConfig']);

    await TestBed.configureTestingModule({
      imports: [AppComponent, AppShellToastsComponent, BrowserAnimationsModule],
      providers: [
        { provide: AzureService, useValue: mockAzureService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: Router, useValue: routerSpy },
        { provide: NatsService, useValue: mockNatsService },
        { provide: AppShellToastService, useValue: mockToastService },
        { provide: AppConfigService, useValue: mockAppConfigService },
        provideHttpClient()
      ]
    }).compileComponents();

    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(catalogDescriptorsSubject.asObservable());
    mockCatalogService.getCatalogDescriptors.and.returnValue([{ slug: 'test-catalog', id: '1' }]);
    mockCatalogService.getSlugUrl.and.callFake((slug: string) => slug);
    mockCatalogService.getCatalog.and.returnValue(of({ slug: 'test-catalog', id: '1', links: [] } as Catalog));
    mockAppConfigService.getConfig.and.returnValue({ natsUrl: 'nats://localhost:4222' });

    catalogDescriptorsSubject.next([{ slug: 'test-catalog', id: '1' }]);
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    azureLoggedUser$.next({fullName: 'Fake', username: 'fake.user@fakemail.com', projects: []} as AppUser);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the service on ngOnInit', () => {
    component.ngOnInit();
    expect(mockAzureService.initialize).toHaveBeenCalled();
  });

  it('should disable notifications if natsUrl is not defined', () => {
    mockAppConfigService.getConfig.and.returnValue({ });
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    azureLoggedUser$.next({fullName: 'Fake', username: 'fake.user@fakemail.com', projects: []} as AppUser);
    expect(component.appShellNotificationsLink).toBeUndefined();
  });

  it('should set the appShellNotificationsLink to undefined if there is any error with nats initialization', fakeAsync(() => {
    mockNatsService.initialize.and.rejectWith(new Error('Initialization error'));
    azureLoggedUser$.next({fullName: 'Fake', username: 'fake.user@fakemail.com', projects: []} as AppUser);
    tick();
    expect(component.appShellNotificationsLink).toBeUndefined();
  }));

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
    } as unknown as Navigation);
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(of(mockCatalogs));
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'setCatalogShell');

    catalogDescriptorsSubject.next(mockCatalogs);

    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalogs[0]);
  });

  it('should set the catalog shell if no catalog segment is found in the current navigation but is a defined route', () => {
    const mockCatalogs = [{ slug: 'catalog-1', id: '1' }];
    routerSpy.getCurrentNavigation.and.returnValue(null);
    Object.defineProperty(routerSpy, 'url', { get: () => 'route' });
    routerSpy.config = [{ path: 'route', component: AppComponent }];
    spyOn(sessionStorage, 'getItem').and.returnValue(null);
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(of(mockCatalogs));
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'setCatalogShell');
    catalogDescriptorsSubject.next(mockCatalogs);
    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalogs[0]);
  });

    it('should set the catalog shell if no catalog segment is found in the current navigation but is a defined route with an extra slash', () => {
    const mockCatalogs = [{ slug: 'catalog-1', id: '1' }];
    routerSpy.getCurrentNavigation.and.returnValue(null);
    Object.defineProperty(routerSpy, 'url', { get: () => '/route' });
    routerSpy.config = [{ path: 'route', component: AppComponent }];
    spyOn(sessionStorage, 'getItem').and.returnValue(null);
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(of(mockCatalogs));
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'setCatalogShell');
    catalogDescriptorsSubject.next(mockCatalogs);
    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalogs[0]);
  });

  it('should pick the session storage catalog if no catalog segment is found in the current navigation', () => {
    const mockCatalogs = [{ slug: 'catalog-1', id: '1' }];
    routerSpy.getCurrentNavigation.and.returnValue(null);
    routerSpy.config = [{ path: 'catalog-1', component: AppComponent }];
    spyOn(sessionStorage, 'getItem').and.returnValue(null);
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(of(mockCatalogs));
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'setCatalogShell');
    catalogDescriptorsSubject.next(mockCatalogs);
    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalogs[0]);
  });

  it('should pick the first catalog if no catalog segment is found in the current navigation', () => {
    const mockCatalogs = [{ slug: 'catalog-1', id: '1' }];
    routerSpy.getCurrentNavigation.and.returnValue(null);
    spyOn(sessionStorage, 'getItem').and.returnValue(null);
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(of(mockCatalogs));
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'setCatalogShell');
    catalogDescriptorsSubject.next(mockCatalogs);
    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalogs[0]);
  });

  it('should pick the catalog from sessionstorage if no catalog segment is found in the current navigation', () => {
    const mockCatalogs = [{ slug: 'catalog-1', id: '1' }, { slug: 'catalog-2', id: '2' }];
    routerSpy.getCurrentNavigation.and.returnValue(null);
    spyOn(sessionStorage, 'getItem').and.returnValue('catalog-2');
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(of(mockCatalogs));
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'setCatalogShell');
    catalogDescriptorsSubject.next(mockCatalogs);
    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalogs[1]);
  });

  it('should call initializeUser with a valid NATS user name', fakeAsync(() => {
    azureLoggedUser$.next({fullName: 'Fake', username: 'fake.user@fakemail.com', projects: []} as AppUser);
    natsMessageCount$.next(0);
    tick(5000);
    expect(mockNatsService.initializeUser).toHaveBeenCalledWith('fake_user', []);
    expect(mockToastService.showToast).not.toHaveBeenCalled();
  }));

  it('should show a toast with the initial notifications count', fakeAsync(() => {
    component['liveMessageSubscription'] = undefined;
    component['unreadMessagesCountSubscription'] = undefined;
    azureLoggedUser$.next({fullName: 'Fake', username: 'fake.user@fakemail.com', projects: []} as AppUser);
    mockNatsService.initializeUser.and.resolveTo();
    tick();
    expect(mockNatsService.initializeUser).toHaveBeenCalledWith('fake_user', []);
    natsMessageCount$.next(3);
    tick(5000);
    expect(mockToastService.showToast).toHaveBeenCalled();
  }));

  it('should manage properly the received message from nats service', fakeAsync(() => {
    mockToastService.showToast.calls.reset();
    natsLiveMessage$.next(null);
    expect(mockToastService.showToast).not.toHaveBeenCalled();
    mockNatsService.isValidMessage.and.returnValue(false);
    natsLiveMessage$.next({data: {}} as NatsMessage);
    expect(mockToastService.showToast).not.toHaveBeenCalled();
    mockNatsService.isValidMessage.and.throwError(new Error('Invalid message format'));
    natsLiveMessage$.next({data: {}} as NatsMessage);
    expect(mockToastService.showToast).not.toHaveBeenCalled();
    mockNatsService.isValidMessage.and.returnValue(true);
    natsLiveMessage$.next({data: {}} as NatsMessage);
    expect(mockToastService.showToast).toHaveBeenCalled();
  }));
});