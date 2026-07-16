import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of, throwError, firstValueFrom } from 'rxjs';

import { GroupsGuard } from './groups.guard';
import { AzureService } from '../services/azure.service';
import { CatalogOwnersGroupAccessStore } from '../services/catalog-owners-group-access-store.service';

describe('GroupsGuard', () => {
  let guard: GroupsGuard;

  let azureServiceMock: any;
  let catalogOwnersMock: any;
  let routerMock: jasmine.SpyObj<Router>;
  let mockUrlTree: UrlTree;

  beforeEach(() => {
    mockUrlTree = {} as UrlTree;

    azureServiceMock = {
      userGroups$: of([])
    };

    catalogOwnersMock = {
      currentOwners$: of([])
    };

    routerMock = jasmine.createSpyObj('Router', ['parseUrl']);
    routerMock.parseUrl.and.returnValue(mockUrlTree);

    TestBed.configureTestingModule({
      providers: [
        GroupsGuard,
        { provide: AzureService, useValue: azureServiceMock },
        { provide: CatalogOwnersGroupAccessStore, useValue: catalogOwnersMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    guard = TestBed.inject(GroupsGuard);
  });

  it('should allow access when user is owner', async () => {
    azureServiceMock.userGroups$ = of(['owner1']);
    catalogOwnersMock.currentOwners$ = of(['owner1']);

    const route: any = {
      data: {
        requiredOwners: true
      }
    };

    const result = await firstValueFrom(
      guard.canActivate(route)
    );

    expect(result).toBeTrue();
  });

  it('should allow access when user belongs to required group', async () => {
    azureServiceMock.userGroups$ = of(['groupA']);

    const route: any = {
      data: {
        requiredGroups: ['groupA']
      }
    };

    const result = await firstValueFrom(
      guard.canActivate(route)
    );

    expect(result).toBeTrue();
  });

  it('should redirect when user has no access', async () => {
    azureServiceMock.userGroups$ = of(['groupA']);
    catalogOwnersMock.currentOwners$ = of(['owner1']);

    const route: any = {
      data: {
        requiredOwners: true,
        requiredGroups: ['groupB']
      }
    };

    const result = await firstValueFrom(
      guard.canActivate(route)
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/page-not-found');
    expect(result).toBe(mockUrlTree);
  });

  it('should redirect on error', async () => {
    azureServiceMock.userGroups$ = throwError(
      () => new Error('error')
    );

    const route: any = {
      data: {}
    };

    const result = await firstValueFrom(
      guard.canActivate(route)
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/page-not-found');
    expect(result).toBe(mockUrlTree);
  });
});