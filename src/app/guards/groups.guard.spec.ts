import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';
import { Router, UrlTree } from '@angular/router';

import { GroupsGuard } from './groups.guard';
import { AzureService } from '../services/azure.service';
import { CatalogService } from '../services/catalog.service';

describe('GroupsGuard', () => {
  let guard: GroupsGuard;

  let azureServiceMock: any;
  let catalogServiceMock: any;
  let routerMock: jasmine.SpyObj<Router>;
  let mockUrlTree: UrlTree;
  let userGroups$: BehaviorSubject<string[]>;

  beforeEach(() => {
    mockUrlTree = {} as UrlTree;
    userGroups$ = new BehaviorSubject<string[]>([]);

    azureServiceMock = {
      userGroups$,
      loadUserGroups: jasmine.createSpy('loadUserGroups').and.returnValue(of([]))
    };

    catalogServiceMock = {
      getSlugUrl: jasmine.createSpy('getSlugUrl').and.callFake((slug: string) => slug),
      getCatalogDescriptors: jasmine.createSpy('getCatalogDescriptors').and.returnValue([]),
      retrieveCatalogDescriptors: jasmine.createSpy('retrieveCatalogDescriptors').and.returnValue(of([])),
      setCatalogDescriptors: jasmine.createSpy('setCatalogDescriptors'),
      getCatalog: jasmine.createSpy('getCatalog').and.returnValue(of({ owners: [] }))
    };

    routerMock = jasmine.createSpyObj('Router', ['parseUrl']);
    routerMock.parseUrl.and.returnValue(mockUrlTree);

    TestBed.configureTestingModule({
      providers: [
        GroupsGuard,
        { provide: AzureService, useValue: azureServiceMock },
        { provide: CatalogService, useValue: catalogServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    guard = TestBed.inject(GroupsGuard);
  });

  it('should allow access when user is owner', async () => {
    azureServiceMock.loadUserGroups.and.returnValue(of(['owner1']));
    catalogServiceMock.getCatalogDescriptors.and.returnValue([
      { id: 'cat-1', slug: 'catalog-a', owners: ['owner1'] }
    ]);

    const route: any = {
      data: {
        requiredOwners: true
      },
      paramMap: {
        get: () => 'catalog-a'
      }
    };

    const result = await firstValueFrom(
      guard.canActivate(route)
    );

    expect(result).toBeTrue();
    expect(azureServiceMock.userGroups$.value).toEqual(['owner1']);
  });

  it('should allow access when user belongs to required group', async () => {
    azureServiceMock.loadUserGroups.and.returnValue(of(['groupA']));

    const route: any = {
      data: {
        requiredGroups: ['groupA']
      },
      paramMap: {
        get: () => null
      }
    };

    const result = await firstValueFrom(
      guard.canActivate(route)
    );

    expect(result).toBeTrue();
  });

  it('should redirect when user has no access', async () => {
    azureServiceMock.loadUserGroups.and.returnValue(of(['groupA']));
    catalogServiceMock.getCatalogDescriptors.and.returnValue([
      { id: 'cat-1', slug: 'catalog-a', owners: ['owner1'] }
    ]);

    const route: any = {
      data: {
        requiredOwners: true,
        requiredGroups: ['groupB']
      },
      paramMap: {
        get: () => 'catalog-a'
      }
    };

    const result = await firstValueFrom(
      guard.canActivate(route)
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/page-not-found');
    expect(result).toBe(mockUrlTree);
  });

  it('should redirect on loadUserGroups error', async () => {
    azureServiceMock.loadUserGroups.and.returnValue(throwError(
      () => new Error('error')
    ));

    catalogServiceMock.getCatalogDescriptors.and.returnValue([
      { id: 'cat-1', slug: 'catalog-a', owners: ['owner1'] }
    ]);

    const route: any = {
      data: {
        requiredOwners: true
      },
      paramMap: {
        get: () => 'catalog-a'
      }
    };

    const result = await firstValueFrom(
      guard.canActivate(route)
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/page-not-found');
    expect(result).toBe(mockUrlTree);
  });

  it('should fetch catalog owners from catalog endpoint when descriptor has no owners', async () => {
    azureServiceMock.loadUserGroups.and.returnValue(of(['owner2']));
    catalogServiceMock.getCatalogDescriptors.and.returnValue([
      { id: 'cat-2', slug: 'catalog-b' }
    ]);
    catalogServiceMock.getCatalog.and.returnValue(of({ owners: ['owner2'] }));

    const route: any = {
      data: {
        requiredOwners: true
      },
      paramMap: {
        get: () => 'catalog-b'
      }
    };

    const result = await firstValueFrom(guard.canActivate(route));

    expect(result).toBeTrue();
    expect(catalogServiceMock.getCatalog).toHaveBeenCalledWith('cat-2');
  });

  it('should allow access immediately when route has no permission requirements', async () => {
    const route: any = {
      data: {},
      paramMap: {
        get: () => null
      }
    };

    const result = await firstValueFrom(guard.canActivate(route));

    expect(result).toBeTrue();
    expect(azureServiceMock.loadUserGroups).not.toHaveBeenCalled();
  });
});