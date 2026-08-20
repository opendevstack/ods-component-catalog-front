import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';
import { Router, UrlTree } from '@angular/router';

import { GroupsGuard } from './groups.guard';
import { AzureService } from '../services/azure.service';
import { CatalogAccessStore } from '../services/catalog-access-store.service';
import { CatalogService } from '../services/catalog.service';
import { Catalog, CatalogDescriptor } from '../openapi/component-catalog';

// Owners aren't part of the generated CatalogDescriptor model; GroupsGuard reads them via its own CatalogDescriptorWithOwners cast.
type CatalogDescriptorFixture = CatalogDescriptor & { owners?: string[] };

describe('GroupsGuard', () => {
  let guard: GroupsGuard;

  let azureServiceMock: jasmine.SpyObj<AzureService>;
  let catalogAccessStoreMock: jasmine.SpyObj<CatalogAccessStore>;
  let catalogServiceMock: jasmine.SpyObj<CatalogService>;
  let routerMock: jasmine.SpyObj<Router>;
  let mockUrlTree: UrlTree;
  let userGroups$: BehaviorSubject<string[]>;

  beforeEach(() => {
    mockUrlTree = {} as UrlTree;
    userGroups$ = new BehaviorSubject<string[]>([]);

    azureServiceMock = jasmine.createSpyObj<AzureService>(
      'AzureService',
      ['loadUserGroups'],
      { userGroups$ }
    );
    azureServiceMock.loadUserGroups.and.returnValue(of([]));

    catalogAccessStoreMock = jasmine.createSpyObj(
      'CatalogAccessStore',
      ['getCurrentOwners']
    );
    catalogAccessStoreMock.getCurrentOwners.and.returnValue([]);

    catalogServiceMock = jasmine.createSpyObj<CatalogService>(
      'CatalogService',
      ['getSlugUrl', 'getCatalogDescriptors', 'retrieveCatalogDescriptors', 'setCatalogDescriptors', 'getCatalog'],
      { selectedCatalogSlug: null }
    );
    // jasmine.createSpyObj's property option is get-only; force a writable data property so tests can reassign it.
    Object.defineProperty(catalogServiceMock, 'selectedCatalogSlug', { value: null, writable: true, configurable: true });
    catalogServiceMock.getSlugUrl.and.callFake((slug: string) => slug);
    catalogServiceMock.getCatalogDescriptors.and.returnValue([]);
    catalogServiceMock.retrieveCatalogDescriptors.and.returnValue(of([]));
    catalogServiceMock.getCatalog.and.returnValue(of({ owners: [] } as Catalog));

    routerMock = jasmine.createSpyObj('Router', ['parseUrl']);
    routerMock.parseUrl.and.returnValue(mockUrlTree);

    TestBed.configureTestingModule({
      providers: [
        GroupsGuard,
        { provide: AzureService, useValue: azureServiceMock },
        { provide: CatalogAccessStore, useValue: catalogAccessStoreMock },
        { provide: CatalogService, useValue: catalogServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    guard = TestBed.inject(GroupsGuard);
  });

  it('should allow access when user is owner', async () => {
    azureServiceMock.loadUserGroups.and.returnValue(of(['owner1']));
    catalogServiceMock.getCatalogDescriptors.and.returnValue([
      { id: 'cat-1', slug: 'catalog-a', owners: ['owner1'] } as CatalogDescriptorFixture
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

  it('should use cached groups when already loaded', async () => {
    userGroups$.next(['owner1']);
    catalogServiceMock.getCatalogDescriptors.and.returnValue([
      { id: 'cat-1', slug: 'catalog-a', owners: ['owner1'] } as CatalogDescriptorFixture
    ]);

    const route: any = {
      data: {
        requiredOwners: true
      },
      paramMap: {
        get: () => 'catalog-a'
      }
    };

    const result = await firstValueFrom(guard.canActivate(route));

    expect(result).toBeTrue();
    expect(azureServiceMock.loadUserGroups).not.toHaveBeenCalled();
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
      { id: 'cat-1', slug: 'catalog-a', owners: ['owner1'] } as CatalogDescriptorFixture
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
      { id: 'cat-1', slug: 'catalog-a', owners: ['owner1'] } as CatalogDescriptorFixture
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
    catalogServiceMock.getCatalog.and.returnValue(of({ owners: ['owner2'] } as Catalog));

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

  it('should use cached owners for the selected catalog', async () => {
    azureServiceMock.loadUserGroups.and.returnValue(of(['owner2']));
    catalogServiceMock.selectedCatalogSlug = 'catalog-b';
    catalogAccessStoreMock.getCurrentOwners.and.returnValue(['owner2']);

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
    expect(catalogAccessStoreMock.getCurrentOwners).toHaveBeenCalled();
    expect(catalogServiceMock.getCatalog).not.toHaveBeenCalled();
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
