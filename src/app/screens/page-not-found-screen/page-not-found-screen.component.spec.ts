import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageNotFoundScreenComponent } from './page-not-found-screen.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';

describe('PageNotFoundScreenComponent', () => {
  let component: PageNotFoundScreenComponent;
  let fixture: ComponentFixture<PageNotFoundScreenComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getCatalogDescriptors', 'getSelectedCatalogSlug', 'getSlugUrl']);
    await TestBed.configureTestingModule({
      imports: [PageNotFoundScreenComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: routerSpy
        },
        {
          provide: CatalogService,
          useValue: catalogServiceSpy
        },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageNotFoundScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to selected catalog slug when it exists', () => {
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{ slug: 'ignored' }] as any);
    catalogServiceSpy.getSelectedCatalogSlug.and.returnValue('selected-catalog');

    component.goToMarketplace();

    expect(catalogServiceSpy.getSelectedCatalogSlug).toHaveBeenCalled();
    expect(catalogServiceSpy.getSlugUrl).not.toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/selected-catalog']);
  });

  it('should navigate to first catalog when no selected catalog slug exists', () => {
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{ slug: 'catalog-a' }] as any);
    catalogServiceSpy.getSelectedCatalogSlug.and.returnValue(null);
    catalogServiceSpy.getSlugUrl.and.returnValue('catalog-a');

    component.goToMarketplace();

    expect(catalogServiceSpy.getCatalogDescriptors).toHaveBeenCalled();
    expect(catalogServiceSpy.getSlugUrl).toHaveBeenCalledWith('catalog-a');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/catalog-a']);
  });

  it('should not navigate when there are no catalogs and no selected catalog slug', () => {
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([] as any);
    catalogServiceSpy.getSelectedCatalogSlug.and.returnValue(null);

    component.goToMarketplace();

    expect(catalogServiceSpy.getSlugUrl).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate when getSlugUrl returns null', () => {
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{ slug: 'catalog-a' }] as any);
    catalogServiceSpy.getSelectedCatalogSlug.and.returnValue(null);
    catalogServiceSpy.getSlugUrl.and.returnValue(null as any);

    component.goToMarketplace();

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate when selected catalog slug is an empty string', () => {
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{ slug: 'catalog-a' }] as any);
    catalogServiceSpy.getSelectedCatalogSlug.and.returnValue('');

    component.goToMarketplace();

    expect(catalogServiceSpy.getSlugUrl).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
