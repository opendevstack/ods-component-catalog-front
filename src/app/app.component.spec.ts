import { AppShellToastsComponent, AppShellToastService } from '@opendevstack/ngx-appshell'
import { NatsMessage, NatsService } from './services/nats.service'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { of, Subject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { AzureService } from './services/azure.service';
import { CatalogService } from './services/catalog.service';
import { Catalog, CatalogDescriptor } from './openapi/component-catalog';
import { NavigationEnd, Router } from '@angular/router';
import { AppConfigService } from './services/app-config.service';
import { AppUser } from './models/app-user';
import { ProjectService } from './services/project.service';
import { AppProject } from './models/project';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PlatformSelectorWidgetDialogComponent } from './components/platform-selector-widget-dialog/platform-selector-widget-dialog.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockAzureService: jasmine.SpyObj<AzureService>;
  let mockCatalogService: jasmine.SpyObj<CatalogService>;
  const catalogDescriptorsSubject = new Subject<CatalogDescriptor[]>();
  const selectedCatalogSlugSubject = new Subject<string | null>();
  let routerSpy: jasmine.SpyObj<Router>;
  let mockNatsService: jasmine.SpyObj<NatsService>;
  let mockToastService: jasmine.SpyObj<AppShellToastService>;
  let mockAppConfigService: jasmine.SpyObj<AppConfigService>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;
  const dialogSubject = new Subject<any>();
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<PlatformSelectorWidgetDialogComponent>>;
  let azureLoggedUser$: Subject<AppUser>;
  let natsLiveMessage$: Subject<NatsMessage | null>;
  let natsMessageCount$: Subject<number>;
  const routerEventsSubject = new Subject<any>();
  const projectSubject = new Subject<AppProject>();

  beforeEach(async () => {
    azureLoggedUser$ = new Subject<AppUser>();
    natsLiveMessage$ = new Subject<NatsMessage | null>();
    natsMessageCount$ = new Subject<number>();
    mockAzureService = jasmine.createSpyObj('AzureService', ['initialize', 'login', 'logout', 'refreshToken'], { loggedUser$: azureLoggedUser$.asObservable() });
    mockNatsService = jasmine.createSpyObj('NatsService', ['initialize', 'initializeUser', 'readMessages', 'isValidMessage'], { liveMessage$: natsLiveMessage$.asObservable(), unreadMessagesCount$: natsMessageCount$.asObservable() });
    mockToastService = jasmine.createSpyObj('AppShellToastService', ['showToast'], { toasts$: of([]) });
    mockCatalogService = jasmine.createSpyObj(
      'CatalogService',
      ['retrieveCatalogDescriptors', 'setCatalogDescriptors', 'getCatalogDescriptors', 'getSlugUrl', 'getCatalog', 'setSelectedCatalogSlug', 'getSelectedCatalogSlug', 'getSelectedCatalogDescriptor'],
      { selectedCatalogSlug$: selectedCatalogSlugSubject.asObservable() }
    );
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation'], { events: routerEventsSubject.asObservable(), url: '/' });
    mockAppConfigService = jasmine.createSpyObj('AppConfigService', ['getConfig']);
    mockProjectService = jasmine.createSpyObj('ProjectService', ['getCurrentProject', 'setCurrentProject', 'getUserProjects', 'getProjectCluster'], { project$: projectSubject.asObservable() });
    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);

    await TestBed.configureTestingModule({
      imports: [AppComponent, AppShellToastsComponent, BrowserAnimationsModule],
      providers: [
        { provide: AzureService, useValue: mockAzureService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: Router, useValue: routerSpy },
        { provide: NatsService, useValue: mockNatsService },
        { provide: AppShellToastService, useValue: mockToastService },
        { provide: AppConfigService, useValue: mockAppConfigService },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: MatDialog, useValue: mockMatDialog },
        provideHttpClient()
      ]
    }).compileComponents();

    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(catalogDescriptorsSubject.asObservable());
    mockCatalogService.getCatalogDescriptors.and.returnValue([{ slug: 'test-catalog', id: '1' }]);
    mockCatalogService.getSlugUrl.and.callFake((slug: string) => slug);
    mockCatalogService.getCatalog.and.returnValue(of({ slug: 'test-catalog', id: '1', links: [] } as Catalog));
    mockCatalogService.getSelectedCatalogSlug.and.returnValue(null);
    mockCatalogService.getSelectedCatalogDescriptor.and.returnValue({ slug: 'test-catalog', id: '1' });
    mockAppConfigService.getConfig.and.returnValue({ natsUrl: 'nats://localhost:4222' });
    mockAzureService.refreshToken.and.returnValue(Promise.resolve({ accessToken: 'new-token' } as any));
    mockProjectService.getUserProjects.and.returnValue(of([]));
    mockDialogRef.afterClosed.and.returnValue(dialogSubject.asObservable());
    mockMatDialog.open.and.returnValue(mockDialogRef);

    catalogDescriptorsSubject.next([{ slug: 'test-catalog', id: '1' }]);
    projectSubject.next({projectKey: 'PROJECT 1', location: 'LOCATION 1'} as AppProject);
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

  it('should disable notifications if natsUrl is not defined', fakeAsync(() => {
    mockAppConfigService.getConfig.and.returnValue({ });
    fixture.detectChanges();
    azureLoggedUser$.next({fullName: 'Fake', username: 'fake.user@fakemail.com', projects: []} as AppUser);
    tick();
    expect(component.appShellNotificationsLink).toBeUndefined();
  }));

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
          { label: 'Add Components', anchor: '/test-catalog', icon: 'cart' },
          { label: 'Community', anchor: '/test-catalog/community', icon: 'people' }
        ]
      }
    ]);

    expect(component.sidenavLinks.links).toEqual([
      { label: 'Link1', anchor: 'http://example.com/link1', icon: 'link', target: '_blank' },
      { label: 'Link2', anchor: 'http://example.com/link2', icon: 'link', target: '_blank' }
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
          { label: 'Add Components', anchor: '/test-catalog', icon: 'cart' },
          { label: 'Community', anchor: '/test-catalog/community', icon: 'people' }
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
          { label: 'Add Components', anchor: '/test-catalog', icon: 'cart' },
          { label: 'Community', anchor: '/test-catalog/community', icon: 'people' }
        ]
      }
    ]);

    expect(component.sidenavLinks.links).toEqual([]);
  });
  
  it('should set the catalog shell when the selected catalog slug changes in CatalogService', fakeAsync(() => {
    const mockCatalogs = [{ slug: 'catalog-1', id: '1' }];
    mockCatalogService.getCatalogDescriptors.and.returnValue(mockCatalogs);
    spyOn(component, 'setCatalogShell');

    component.ngOnInit();
    selectedCatalogSlugSubject.next('catalog-1');
    tick();

    expect(component.setCatalogShell).toHaveBeenCalledWith(mockCatalogs[0]);
  }));

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

  it('should manage properly the received message from nats service', async () => {
    mockToastService.showToast.calls.reset();
    natsLiveMessage$.next(null);
    await fixture.whenStable();
    expect(mockToastService.showToast).not.toHaveBeenCalled();
    mockNatsService.isValidMessage.and.returnValue(false);
    natsLiveMessage$.next({data: {}} as NatsMessage);
    await fixture.whenStable();
    expect(mockToastService.showToast).not.toHaveBeenCalled();
    mockNatsService.isValidMessage.and.returnValue(false);
    natsLiveMessage$.next({data: null} as any);
    await fixture.whenStable();
    expect(mockToastService.showToast).not.toHaveBeenCalled();
    mockNatsService.isValidMessage.and.throwError(new Error('Invalid message format'));
    natsLiveMessage$.next({data: {}} as NatsMessage);
    await fixture.whenStable();
    expect(mockToastService.showToast).not.toHaveBeenCalled();
    mockNatsService.isValidMessage.and.returnValue(true);
    natsLiveMessage$.next({data: {}} as NatsMessage);
    await fixture.whenStable();
    expect(mockToastService.showToast).toHaveBeenCalled();
  });

  it('should set first project when no project is in URL and no current project exists', fakeAsync(() => {
    const mockProjects = ['PROJECT1', 'PROJECT2'];
    const mockUser = { fullName: 'Test User', username: 'test.user@example.com', projects: [] } as AppUser;
    
    Object.defineProperty(routerSpy, 'url', { get: () => '/test-catalog', configurable: true });
    
    mockProjectService.getUserProjects.and.returnValue(of(mockProjects));
    mockProjectService.getCurrentProject.and.returnValue(null);
    
    component.ngOnInit();
    tick();
    
    azureLoggedUser$.next(mockUser);
    tick();
    
    expect(mockProjectService.setCurrentProject).toHaveBeenCalledWith('PROJECT1');
    expect(component.projectPicker.selected).toBe('PROJECT1');
  }));

  it('should set appShellNotificationsLink to undefined if natsUrl is not defined when initializeNats', () => {
    component.appShellNotificationsLink = { anchor: 'some-link'};
    mockAppConfigService.getConfig.and.returnValue({ });
    const newComponent = new AppComponent(
      mockCatalogService,
      routerSpy,
      mockAzureService,
      mockToastService,
      mockNatsService,
      mockAppConfigService,
      mockProjectService,
      mockMatDialog
    );
    newComponent.initializeNats(null);
    expect(newComponent.appShellNotificationsLink).toBeUndefined();
  });

  it('should keep current project when it exists in user projects list', fakeAsync(() => {
    const mockProjects = ['PROJECT1', 'PROJECT2'];
    const mockUser = { fullName: 'Test User', username: 'test.user@example.com', projects: [] } as AppUser;
    const currentProject = { projectKey: 'PROJECT2', location: 'LOCATION' } as AppProject;
    
    Object.defineProperty(routerSpy, 'url', { get: () => '/test-catalog', configurable: true });
    
    mockProjectService.getUserProjects.and.returnValue(of(mockProjects));
    mockProjectService.getCurrentProject.and.returnValue(currentProject);
    
    component.ngOnInit();
    tick();
    
    azureLoggedUser$.next(mockUser);
    tick();
    
    expect(mockProjectService.setCurrentProject).toHaveBeenCalledWith('PROJECT2');
    expect(component.projectPicker.selected).toBe('PROJECT2');
    expect(component.projectPicker.options).toEqual(mockProjects);
  }));

  it('should set first project when current project is not in user projects list', fakeAsync(() => {
    const mockProjects = ['PROJECT1', 'PROJECT2'];
    const mockUser = { fullName: 'Test User', username: 'test.user@example.com', projects: [] } as AppUser;
    const currentProject = { projectKey: 'PROJECT3', location: 'LOCATION' } as AppProject;
    
    Object.defineProperty(routerSpy, 'url', { get: () => '/test-catalog', configurable: true });
    
    mockProjectService.getUserProjects.and.returnValue(of(mockProjects));
    mockProjectService.getCurrentProject.and.returnValue(currentProject);
    
    component.ngOnInit();
    tick();
    
    azureLoggedUser$.next(mockUser);
    tick();
    
    expect(mockProjectService.setCurrentProject).toHaveBeenCalledWith('PROJECT1');
    expect(component.projectPicker.selected).toBe('PROJECT1');
  }));

  it('should update project picker when project$ emits', fakeAsync(() => {
    component.ngOnInit();
    tick();
    
    const newProject = { projectKey: 'NEW_PROJECT', location: 'NEW_LOCATION' } as AppProject;
    projectSubject.next(newProject);
    tick();
    
    expect(component.projectPicker.selected).toBe('NEW_PROJECT');
  }));
  
  it('should call setCurrentProject and update projectPicker when pickProject is called', () => {
    const projectKey = 'PROJECT1';
    
    component.pickProject(projectKey);
    
    expect(mockProjectService.setCurrentProject).toHaveBeenCalledWith(projectKey);
    expect(component.projectPicker.selected).toBe(projectKey);
  });

  it('should preserve other projectPicker properties when updating selected project', () => {
    const initialOptions = ['PROJECT1', 'PROJECT2', 'PROJECT3'];
    component.projectPicker = {
      label: 'Project: ',
      options: initialOptions,
      selected: 'PROJECT1'
    };
    
    component.pickProject('PROJECT2');
    
    expect(component.projectPicker.label).toBe('Project: ');
    expect(component.projectPicker.options).toEqual(initialOptions);
    expect(component.projectPicker.selected).toBe('PROJECT2');
    expect(mockProjectService.setCurrentProject).toHaveBeenCalledWith('PROJECT2');
  });

  it('should extract project from query params and update project picker', fakeAsync(() => {
    const projectKey = 'TEST_PROJECT';
    Object.defineProperty(routerSpy, 'url', { 
      get: () => `/test-catalog?projectKey=${projectKey}`, 
      configurable: true 
    });

    component.ngOnInit();
    tick();

    routerEventsSubject.next(new NavigationEnd(1, `/test-catalog?projectKey=${projectKey}`, `/test-catalog?projectKey=${projectKey}`));
    tick();

    expect(mockProjectService.setCurrentProject).toHaveBeenCalledWith(projectKey);
    expect(component.projectPicker.selected).toBe(projectKey);
  }));

  it('should not update project when projectKey query param is missing', fakeAsync(() => {
    Object.defineProperty(routerSpy, 'url', { 
      get: () => '/test-catalog', 
      configurable: true 
    });

    mockProjectService.setCurrentProject.calls.reset();

    component.ngOnInit();
    tick();

    const initialSelected = component.projectPicker.selected;
    
    routerEventsSubject.next(new NavigationEnd(1, '/test-catalog', '/test-catalog'));
    tick();

    expect(component.projectPicker.selected).toBe(initialSelected);
  }));

  it('should extract project from query params on initial load', fakeAsync(() => {
    const projectKey = 'INITIAL_PROJECT';
    Object.defineProperty(routerSpy, 'url', { 
      get: () => `/test-catalog?projectKey=${projectKey}`, 
      configurable: true 
    });

    const newComponent = new AppComponent(
      mockCatalogService,
      routerSpy,
      mockAzureService,
      mockToastService,
      mockNatsService,
      mockAppConfigService,
      mockProjectService,
      mockMatDialog
    );

    newComponent.ngOnInit();
    tick();

    expect(mockProjectService.setCurrentProject).toHaveBeenCalledWith(projectKey);
    expect(newComponent.projectPicker.selected).toBe(projectKey);
  }));

  it('should handle URL with multiple query params and extract projectKey', fakeAsync(() => {
    const projectKey = 'MULTI_PARAM_PROJECT';
    Object.defineProperty(routerSpy, 'url', { 
      get: () => `/test-catalog?foo=bar&projectKey=${projectKey}&baz=qux`, 
      configurable: true 
    });

    component.ngOnInit();
    tick();

    routerEventsSubject.next(new NavigationEnd(1, `/test-catalog?foo=bar&projectKey=${projectKey}&baz=qux`, `/test-catalog?foo=bar&projectKey=${projectKey}&baz=qux`));
    tick();

    expect(mockProjectService.setCurrentProject).toHaveBeenCalledWith(projectKey);
    expect(component.projectPicker.selected).toBe(projectKey);
  }));

  it('should open platform selector dialog and handle dialog close', fakeAsync(() => {
    component.showPlatformSelector();

    tick();

    expect(component.isPlatformSelectorOpened).toBe(true);
    expect(mockMatDialog.open).toHaveBeenCalledWith(PlatformSelectorWidgetDialogComponent, {
      panelClass: 'platform-selector-widget-dialog',
      data: component.platformSelectorData,
      backdropClass: 'transparent-backdrop'
    });

    dialogSubject.next(undefined);
    tick();
    expect(mockDialogRef.afterClosed).toHaveBeenCalled();
    expect(component.isPlatformSelectorOpened).toBe(false);
  }));

  it('should clear sidenav when updateLayoutForRoute detects not-found route', () => {
    component.sidenavSections = [{ label: 'TEST', links: [] } as any];
    component.sidenavLinks = { ...component.sidenavLinks, links: [{ label: 'X' } as any] };

    spyOn<any>(component, 'isNotFoundRouteActive').and.returnValue(true);
    const clearSpy = spyOn<any>(component, 'clearSidenav').and.callThrough();
    const restoreSpy = spyOn<any>(component, 'restoreSidenav');

    (component as any).updateLayoutForRoute();

    expect(clearSpy).toHaveBeenCalled();
    expect(restoreSpy).not.toHaveBeenCalled();
    expect((component as any)._lastNotFoundState).toBeTrue();
    expect(component.sidenavSections).toEqual([]);
    expect(component.sidenavLinks.links).toEqual([]);
  });

  it('should restore sidenav when leaving not-found route in updateLayoutForRoute', () => {
    component.catalogPicker = { ...component.catalogPicker, selected: 'test-catalog' };
    (component as any)._lastNotFoundState = true;

    spyOn<any>(component, 'isNotFoundRouteActive').and.returnValue(false);
    const restoreSpy = spyOn<any>(component, 'restoreSidenav').and.callThrough();
    const clearSpy = spyOn<any>(component, 'clearSidenav');
    const setCatalogShellSpy = spyOn(component, 'setCatalogShell');

    (component as any).updateLayoutForRoute();

    expect(clearSpy).not.toHaveBeenCalled();
    expect(restoreSpy).toHaveBeenCalled();
    expect(setCatalogShellSpy).toHaveBeenCalled();
    expect((component as any)._lastNotFoundState).toBeFalse();
  });

  it('should not change sidenav when updateLayoutForRoute is non-not-found and was non-not-found', () => {
    (component as any)._lastNotFoundState = false;

    spyOn<any>(component, 'isNotFoundRouteActive').and.returnValue(false);
    const clearSpy = spyOn<any>(component, 'clearSidenav');
    const restoreSpy = spyOn<any>(component, 'restoreSidenav');

    (component as any).updateLayoutForRoute();

    expect(clearSpy).not.toHaveBeenCalled();
    expect(restoreSpy).not.toHaveBeenCalled();
    expect((component as any)._lastNotFoundState).toBeFalse();
  });

  it('should call extractProjectFromQueryParams and updateLayoutForRoute on initial load and on NavigationEnd', () => {
    const localRouterEvents$ = new Subject<any>();
    const localRouterSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation'], {
      events: localRouterEvents$.asObservable(),
      url: '/test-catalog?projectKey=P1'
    });

    const newComponent = new AppComponent(
      mockCatalogService,
      localRouterSpy,
      mockAzureService,
      mockToastService,
      mockNatsService,
      mockAppConfigService,
      mockProjectService,
      mockMatDialog
    );

    const extractSpy = spyOn<any>(newComponent, 'extractProjectFromQueryParams');
    const layoutSpy = spyOn<any>(newComponent, 'updateLayoutForRoute');

    (newComponent as any).listenForProjectInUrl();
    expect(extractSpy).toHaveBeenCalledTimes(1);
    expect(layoutSpy).toHaveBeenCalledTimes(1);

    localRouterEvents$.next(new NavigationEnd(1, '/test-catalog', '/test-catalog'));
    expect(extractSpy).toHaveBeenCalledTimes(2);
    expect(layoutSpy).toHaveBeenCalledTimes(2);
  });

  it('should ignore non-NavigationEnd events in listenForProjectInUrl', () => {
    const localRouterEvents$ = new Subject<any>();
    const localRouterSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation'], {
      events: localRouterEvents$.asObservable(),
      url: '/test-catalog?projectKey=P1'
    });

    const newComponent = new AppComponent(
      mockCatalogService,
      localRouterSpy,
      mockAzureService,
      mockToastService,
      mockNatsService,
      mockAppConfigService,
      mockProjectService,
      mockMatDialog
    );

    const extractSpy = spyOn<any>(newComponent, 'extractProjectFromQueryParams');
    const layoutSpy = spyOn<any>(newComponent, 'updateLayoutForRoute');

    (newComponent as any).listenForProjectInUrl();
    expect(extractSpy).toHaveBeenCalledTimes(1);
    expect(layoutSpy).toHaveBeenCalledTimes(1);

    localRouterEvents$.next({ type: 'SOME_OTHER_ROUTER_EVENT' });
    expect(extractSpy).toHaveBeenCalledTimes(1);
    expect(layoutSpy).toHaveBeenCalledTimes(1);
  });

  it('should not set catalog shell when selected catalog slug is null', fakeAsync(() => {
    const setCatalogShellSpy = spyOn(component, 'setCatalogShell');

    component.ngOnInit();
    tick();

    selectedCatalogSlugSubject.next(null);
    tick();

    expect(setCatalogShellSpy).not.toHaveBeenCalled();
  }));

  it('should not set catalog shell when selected catalog slug does not match any descriptor', fakeAsync(() => {
    const setCatalogShellSpy = spyOn(component, 'setCatalogShell');
    mockCatalogService.getCatalogDescriptors.and.returnValue([{ slug: 'known', id: '1' }]);
    mockCatalogService.getSlugUrl.and.callFake((slug: string) => slug);

    component.ngOnInit();
    tick();

    selectedCatalogSlugSubject.next('unknown');
    tick();

    expect(setCatalogShellSpy).not.toHaveBeenCalled();
  }));

  it('should not reload shell when selected catalog slug is already active', fakeAsync(() => {
    const setCatalogShellSpy = spyOn(component, 'setCatalogShell');
    mockCatalogService.getCatalogDescriptors.and.returnValue([{ slug: 'known', id: '1' }]);
    component.catalogPicker = { ...component.catalogPicker, selected: 'known' };

    component.ngOnInit();
    tick();

    selectedCatalogSlugSubject.next('known');
    tick();

    expect(setCatalogShellSpy).not.toHaveBeenCalled();
  }));

  it('should not set catalog shell in pickProject when selected catalog is missing', () => {
    component.catalogPicker = { ...component.catalogPicker, selected: 'missing-catalog' };
    mockCatalogService.getCatalogDescriptors.and.returnValue([{ slug: 'other', id: '1' }]);
    const setCatalogShellSpy = spyOn(component, 'setCatalogShell');

    component.pickProject('PROJECT_X');

    expect(setCatalogShellSpy).not.toHaveBeenCalled();
  });

  it('should set catalog shell in pickProject when selected catalog exists', () => {
    const selectedCatalog = { slug: 'selected', id: '1' } as any;
    component.catalogPicker = { ...component.catalogPicker, selected: 'selected' };
    mockCatalogService.getCatalogDescriptors.and.returnValue([selectedCatalog]);
    const setCatalogShellSpy = spyOn(component, 'setCatalogShell');

    component.pickProject('PROJECT_X');

    expect(setCatalogShellSpy).toHaveBeenCalledWith(selectedCatalog);
  });

  it('should clear sidenav and return early when setCatalogShell is called on a not-found route', () => {
    const clearSpy = spyOn<any>(component, 'clearSidenav').and.callThrough();
    spyOn<any>(component, 'isNotFoundRouteActive').and.returnValue(true);
    mockCatalogService.getCatalog.calls.reset();

    component.setCatalogShell({ slug: 'test-catalog', id: '1' } as any);

    expect(clearSpy).toHaveBeenCalled();
    expect(mockCatalogService.getCatalog).not.toHaveBeenCalled();
  });

  it('should not populate external links when route becomes not-found during catalog links fetch', fakeAsync(() => {
    spyOn<any>(component, 'isNotFoundRouteActive').and.returnValues(false, true);
    mockCatalogService.getCatalog.and.returnValue(of({ slug: 'test-catalog', id: '1', links: [{ name: 'X', url: 'http://x' }] } as any));

    component.setCatalogShell({ slug: 'test-catalog', id: '1' } as any);
    tick();

    expect(component.sidenavLinks.links).toEqual([]);
  }));

  it('should return early in restoreSidenav when no catalog is selected', () => {
    component.catalogPicker = { ...component.catalogPicker, selected: undefined };
    const setCatalogShellSpy = spyOn(component, 'setCatalogShell');

    (component as any).restoreSidenav();

    expect(setCatalogShellSpy).not.toHaveBeenCalled();
  });

  it('should select catalogs[0] in constructor when no preferred catalog is stored', () => {
    const catalogs$ = new Subject<CatalogDescriptor[]>();
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(catalogs$.asObservable());
    mockCatalogService.getSelectedCatalogDescriptor.and.returnValue(undefined);

    const localRouterSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation'], {
      events: of(),
      url: '/'
    });

    const newComponent = new AppComponent(
      mockCatalogService,
      localRouterSpy,
      mockAzureService,
      mockToastService,
      mockNatsService,
      mockAppConfigService,
      mockProjectService,
      mockMatDialog
    );
    const setCatalogShellSpy = spyOn(newComponent, 'setCatalogShell');

    catalogs$.next([{ slug: 'first', id: '1' } as any]);

    expect(setCatalogShellSpy).toHaveBeenCalledWith({ slug: 'first', id: '1' } as any);
  });

  it('should not set catalog shell in constructor when no catalogs are returned and no preferred exists', () => {
    const catalogs$ = new Subject<CatalogDescriptor[]>();
    mockCatalogService.retrieveCatalogDescriptors.and.returnValue(catalogs$.asObservable());
    mockCatalogService.getSelectedCatalogDescriptor.and.returnValue(undefined);

    const localRouterSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation'], {
      events: of(),
      url: '/'
    });

    const newComponent = new AppComponent(
      mockCatalogService,
      localRouterSpy,
      mockAzureService,
      mockToastService,
      mockNatsService,
      mockAppConfigService,
      mockProjectService,
      mockMatDialog
    );
    const setCatalogShellSpy = spyOn(newComponent, 'setCatalogShell');

    catalogs$.next([]);

    expect(setCatalogShellSpy).not.toHaveBeenCalled();
  });

  it('should traverse route snapshot tree and detect page-not-found route', () => {
    const leaf: any = { routeConfig: { path: 'page-not-found' }, firstChild: null };
    const mid: any = { routeConfig: { path: 'mid' }, firstChild: leaf };
    const root: any = { routeConfig: { path: 'root' }, firstChild: mid };

    Object.defineProperty(routerSpy, 'routerState', {
      get: () => ({ snapshot: { root } }),
      configurable: true
    });

    const deepest = (component as any).getDeepestRouteSnapshot();
    expect(deepest).toBe(leaf);
    expect((component as any).isNotFoundRouteActive()).toBeTrue();
  });

  it('should traverse route snapshot tree and detect wildcard not-found route', () => {
    const leaf: any = { routeConfig: { path: '**' }, firstChild: null };
    const root: any = { routeConfig: { path: 'root' }, firstChild: leaf };

    Object.defineProperty(routerSpy, 'routerState', {
      get: () => ({ snapshot: { root } }),
      configurable: true
    });

    const deepest = (component as any).getDeepestRouteSnapshot();
    expect(deepest).toBe(leaf);
    expect((component as any).isNotFoundRouteActive()).toBeTrue();
  });
});