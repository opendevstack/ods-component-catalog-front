import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, Subject } from 'rxjs';

import { CatalogActivityScreenComponent } from './catalog-activity-screen.component';
import { CatalogService } from '../../services/catalog.service';
import { SortOrder, SortParameter } from '../../openapi/component-catalog';

describe('CatalogActivityScreenComponent', () => {
  let component: CatalogActivityScreenComponent;
  let fixture: ComponentFixture<CatalogActivityScreenComponent>;

  let routeParams$: Subject<any>;

  let catalogServiceMock: jasmine.SpyObj<CatalogService>;
  let routerMock: jasmine.SpyObj<Router>;
  let cdMock: jasmine.SpyObj<ChangeDetectorRef>;

  beforeEach(async () => {
    routeParams$ = new Subject();

    catalogServiceMock = jasmine.createSpyObj(
      'CatalogService',
      [
        'setSelectedCatalogSlug',
        'getCatalogDescriptors',
        'getSlugUrl',
        'getCatalogActivities'
      ]
    );

    routerMock = jasmine.createSpyObj(
      'Router',
      ['navigate']
    );

    cdMock = jasmine.createSpyObj(
      'ChangeDetectorRef',
      ['detectChanges']
    );

    await TestBed.configureTestingModule({
      imports: [CatalogActivityScreenComponent],
      providers: [
        {
          provide: CatalogService,
          useValue: catalogServiceMock
        },
        {
          provide: Router,
          useValue: routerMock
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: routeParams$.asObservable()
          }
        },
        {
          provide: ChangeDetectorRef,
          useValue: cdMock
        }
      ]
    }).compileComponents();

    catalogServiceMock.getSlugUrl.and.callFake(
      (slug: string) => slug
    );
    catalogServiceMock.getCatalogActivities.and.returnValue(
      of({
        data: [],
        pagination: {
          page: 0,
          totalPages: 1
        }
      } as any)
    );

    fixture = TestBed.createComponent(
      CatalogActivityScreenComponent
    );

    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate home when catalog does not exist', () => {
    catalogServiceMock.getCatalogDescriptors.and.returnValue([]);

    component.ngOnInit();

    routeParams$.next({
      catalogSlug: 'unknown'
    });

    expect(routerMock.navigate)
      .toHaveBeenCalledWith(['/']);
  });

  it('should configure breadcrumb when catalog exists', () => {
    catalogServiceMock.getCatalogDescriptors.and.returnValue([
      {
        id: '1',
        slug: 'catalog-a'
      } as any
    ]);

    const loadSpy = spyOn<any>(
      component,
      'loadActivities'
    );

    component.ngOnInit();

    routeParams$.next({
      catalogSlug: 'catalog-a'
    });

    expect(component.catalogId).toBe('1');

    expect(component.breadcrumbLinks).toEqual([
      { anchor: '', label: 'Catalogs' },
      { anchor: '/catalog-a', label: 'catalog-a' },
      { anchor: '', label: 'Catalog Activity' }
    ]);

    expect(loadSpy).toHaveBeenCalledWith(true);
  });

  it('should reset filters', () => {
    component.projectFilterValue = 'PROJECT';
    component.statusFilterValue = 'FAILED';
    component.dateRangeFilterValue = 'Last 365 days';

    component.onResetFilters();

    expect(component.projectFilterValue).toBe('');
    expect(component.statusFilterValue).toBe('');
    expect(component.dateRangeFilterValue).toBe('');
  });

  it('should initialize date range filter to last 30 days', () => {
    expect(component.dateRangeFilterValue).toBe('Last 30 days');
  });

  it('should perform search', () => {
    const loadSpy = spyOn<any>(
      component,
      'loadActivities'
    );

    component.onSearch();

    expect(loadSpy).toHaveBeenCalledWith(true);
  });

  it('should change sort parameter and reset order to desc', () => {
    const loadSpy = spyOn<any>(
      component,
      'loadActivities'
    );

    component.sortParameter = SortParameter.CreationDate;
    component.sortOrder = SortOrder.Asc;

    component.updateSort(
      SortParameter.Status
    );

    expect(component.sortParameter)
      .toBe(SortParameter.Status);

    expect(component.sortOrder)
      .toBe(SortOrder.Desc);

    expect(loadSpy)
      .toHaveBeenCalledWith(true);
  });

  it('should toggle sort order when same column is selected', () => {
    const loadSpy = spyOn<any>(
      component,
      'loadActivities'
    );

    component.sortParameter = SortParameter.Status;
    component.sortOrder = SortOrder.Desc;

    component.updateSort(
      SortParameter.Status
    );

    expect(component.sortOrder)
      .toBe(SortOrder.Asc);

    expect(loadSpy)
      .toHaveBeenCalledWith(true);
  });

  it('should return chevron_right for inactive column', () => {
    component.sortParameter =
      SortParameter.CreationDate;

    expect(
      component.getSortIcon(
        SortParameter.Status
      )
    ).toBe('chevron_right');
  });

  it('should return expand_more for active descending column', () => {
    component.sortParameter =
      SortParameter.Status;

    component.sortOrder =
      SortOrder.Desc;

    expect(
      component.getSortIcon(
        SortParameter.Status
      )
    ).toBe('expand_more');
  });

  it('should return expand_less for active ascending column', () => {
    component.sortParameter =
      SortParameter.Status;

    component.sortOrder =
      SortOrder.Asc;

    expect(
      component.getSortIcon(
        SortParameter.Status
      )
    ).toBe('expand_less');
  });

  it('should call load more when allowed', () => {
    const loadSpy = spyOn<any>(
      component,
      'loadActivities'
    );

    component.hasMore = true;
    component.isLoading = false;
    component.isLoadingMore = false;

    component.onLoadMore();

    expect(component.isLoadingMore)
      .toBeTrue();

    expect(loadSpy)
      .toHaveBeenCalledWith(false);
  });

  it('should not call load more when hasMore is false', () => {
    const loadSpy = spyOn<any>(
      component,
      'loadActivities'
    );

    component.hasMore = false;

    component.onLoadMore();

    expect(loadSpy)
      .not.toHaveBeenCalled();
  });

  it('should not call load more while loading', () => {
    const loadSpy = spyOn<any>(
      component,
      'loadActivities'
    );

    component.hasMore = true;
    component.isLoading = true;

    component.onLoadMore();

    expect(loadSpy)
      .not.toHaveBeenCalled();
  });

  it('should track activity by component id', () => {
    const result =
      component.trackByActivity(
        0,
        {
          componentId: 'comp-1'
        } as any
      );

    expect(result).toBe('comp-1');
  });

  it('should track activity by slug when component id is missing', () => {
    const result =
      component.trackByActivity(
        0,
        {
          catalogItemSlug: 'slug-1'
        } as any
      );

    expect(result).toBe('slug-1');
  });

  it('should use index as fallback trackBy value', () => {
    const result =
      component.trackByActivity(
        55,
        {} as any
      );

    expect(result).toBe(55);
  });

  it('should disconnect observer on destroy', () => {
    const observerMock = {
      disconnect: jasmine.createSpy('disconnect')
    };

    (component as any).intersectionObserver =
      observerMock;

    component.ngOnDestroy();

    expect(
      observerMock.disconnect
    ).toHaveBeenCalled();
  });

  it('should complete destroying subject on destroy', () => {
    const completeSpy = spyOn(
      component['__proto__' as never] ? component['_destroying$'] : component['_destroying$'],
      'complete'
    );

    component.ngOnDestroy();

    expect(completeSpy)
      .toHaveBeenCalled();
  });

  it('should not observe when loadMoreAnchor is missing', () => {
      const observerSpy = spyOn(window as any, 'IntersectionObserver');

      (component as any).observeLoadMoreAnchor();

      expect(observerSpy).not.toHaveBeenCalled();
    });

    it('should not create observer when IntersectionObserver is undefined', () => {
    const originalObserver = (window as any).IntersectionObserver;

    (window as any).IntersectionObserver = undefined;

    component.loadMoreAnchor = {
      nativeElement: document.createElement('div')
    } as any;

    expect(() =>
      (component as any).observeLoadMoreAnchor()
    ).not.toThrow();

    (window as any).IntersectionObserver = originalObserver;
  });

  it('should disconnect existing observer before creating a new one', () => {
    const disconnectSpy = jasmine.createSpy('disconnect');

    (component as any).intersectionObserver = {
      disconnect: disconnectSpy
    };

    component.loadMoreAnchor = {
      nativeElement: document.createElement('div')
    } as any;

    const observeSpy = jasmine.createSpy('observe');

    const observerMock = {
      observe: observeSpy,
      disconnect: jasmine.createSpy('disconnect')
    };

    spyOn(window as any, 'IntersectionObserver')
      .and.returnValue(observerMock);

    (component as any).observeLoadMoreAnchor();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(observeSpy).toHaveBeenCalled();
  });

  it('should load activities and update state for current request', () => {
    component.catalogId = 'catalog-1';

    catalogServiceMock.getCatalogActivities.and.returnValue(
      of({
        data: [
          {
            componentId: 'component-1'
          }
        ],
        pagination: {
          page: 0,
          totalPages: 2
        }
      } as any)
    );

    (component as any).loadActivities(true);

    expect(catalogServiceMock.getCatalogActivities).toHaveBeenCalledWith('catalog-1', jasmine.objectContaining({
      status: undefined,
      startDate: jasmine.any(Number)
    }));
    expect(component.activities.length).toBe(1);
    expect(component.hasMore).toBeTrue();
    expect(component.isLoading).toBeFalse();
  });

  it('should ignore stale responses from previous requests', () => {
    const staleRequest$ = new Subject<any>();

    component.catalogId = 'catalog-1';
    component.activities = [
      {
        componentId: 'current-activity'
      } as any
    ];
    component.isLoadingMore = true;

    catalogServiceMock.getCatalogActivities.and.returnValue(staleRequest$.asObservable());

    (component as any).loadActivities(false);

    component['activeRequestId'] = component['activeRequestId'] + 1;

    staleRequest$.next({
      data: [
        {
          componentId: 'stale-activity'
        }
      ],
      pagination: {
        page: 0,
        totalPages: 3
      }
    });
    staleRequest$.complete();

    expect(component.activities).toEqual([
      {
        componentId: 'current-activity'
      } as any
    ]);
  });
});