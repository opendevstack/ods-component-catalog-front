import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, skip, throwError } from 'rxjs';

import { CatalogAccessStore } from './catalog-access-store.service';
import { CatalogService } from './catalog.service';

describe('CatalogAccessStore', () => {
  let store: CatalogAccessStore;
  let catalogService: jasmine.SpyObj<CatalogService>;
  let selectedCatalogSlug$: BehaviorSubject<string | null>;

  beforeEach(() => {
    selectedCatalogSlug$ = new BehaviorSubject<string | null>(null);

    catalogService = jasmine.createSpyObj(
      'CatalogService',
      [
        'getSelectedCatalogDescriptor',
        'getCatalogDescriptors',
        'getSlugUrl',
        'getCatalog'
      ],
      {
        selectedCatalogSlug$: selectedCatalogSlug$.asObservable()
      }
    );

    TestBed.configureTestingModule({
      providers: [
        CatalogAccessStore,
        {
          provide: CatalogService,
          useValue: catalogService
        }
      ]
    });

    store = TestBed.inject(CatalogAccessStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should emit empty array when selected catalog slug is null', done => {
    store.currentOwners$
      .pipe(skip(1))
      .subscribe(owners => {
        expect(owners).toEqual([]);
        done();
      });

    selectedCatalogSlug$.next(null);
  });

  it('should use owners from selected catalog descriptor when available', done => {
    catalogService.getSelectedCatalogDescriptor.and.returnValue({
      id: '1',
      slug: 'catalog-a',
      owners: ['GROUP_A', 'GROUP_B']
    } as any);

    store.currentOwners$.subscribe(owners => {
      if (owners.length > 0) {
        expect(owners).toEqual([
          'GROUP_A',
          'GROUP_B'
        ]);

        expect(catalogService.getCatalog)
          .not.toHaveBeenCalled();

        done();
      }
    });

    selectedCatalogSlug$.next('catalog-a');
  });

  it('should load owners from catalog endpoint when descriptor has no owners', done => {
    catalogService.getSelectedCatalogDescriptor.and.returnValue({
      id: '1',
      slug: 'catalog-a'
    } as any);

    catalogService.getCatalogDescriptors.and.returnValue([
      {
        id: '1',
        slug: 'catalog-a'
      } as any
    ]);

    catalogService.getSlugUrl.and.callFake(
      (slug: string) => slug
    );

    catalogService.getCatalog.and.returnValue(
      of({
        owners: ['GROUP_X', 'GROUP_Y']
      } as any)
    );

    store.currentOwners$.subscribe(owners => {
      if (owners.length > 0) {
        expect(owners).toEqual([
          'GROUP_X',
          'GROUP_Y'
        ]);

        done();
      }
    });

    selectedCatalogSlug$.next('catalog-a');
  });

  it('should emit empty array when descriptor cannot be found', done => {
    catalogService.getSelectedCatalogDescriptor.and.returnValue(undefined);
    catalogService.getCatalogDescriptors.and.returnValue([]);

    store.currentOwners$
      .pipe(skip(1))
      .subscribe(owners => {
        expect(owners).toEqual([]);
        done();
      });

    selectedCatalogSlug$.next('catalog-a');
  });

  it('should emit empty array when catalog has no owners', done => {
    catalogService.getSelectedCatalogDescriptor.and.returnValue(undefined);

    catalogService.getCatalogDescriptors.and.returnValue([
      {
        id: '1',
        slug: 'catalog-a'
      } as any
    ]);

    catalogService.getSlugUrl.and.returnValue('catalog-a');

    catalogService.getCatalog.and.returnValue(
      of({} as any)
    );

    store.currentOwners$
      .pipe(skip(1))
      .subscribe(owners => {
        expect(owners).toEqual([]);
        done();
      });

    selectedCatalogSlug$.next('catalog-a');
  });

  it('should emit empty array when getCatalog fails', done => {
    catalogService.getSelectedCatalogDescriptor.and.returnValue(undefined);

    catalogService.getCatalogDescriptors.and.returnValue([
      {
        id: '1',
        slug: 'catalog-a'
      } as any
    ]);

    catalogService.getSlugUrl.and.returnValue('catalog-a');

    catalogService.getCatalog.and.returnValue(
      throwError(() => new Error('boom'))
    );

    store.currentOwners$
      .pipe(skip(1))
      .subscribe(owners => {
        expect(owners).toEqual([]);
        done();
      });

    selectedCatalogSlug$.next('catalog-a');
  });
});