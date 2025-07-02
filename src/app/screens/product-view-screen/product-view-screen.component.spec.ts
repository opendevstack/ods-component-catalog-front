import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ProductViewScreenComponent } from './product-view-screen.component';
import { CatalogService } from '../../services/catalog.service';
import { provideHttpClient } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { AppShellProduct } from '@appshell/ngx-appshell';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
import { NoRepositoryAccessDialogComponent } from '../../components/no-repository-access-dialog/no-repository-access-dialog.component';

describe('ProductViewScreenComponent', () => {
  let component: ProductViewScreenComponent;
  let fixture: ComponentFixture<ProductViewScreenComponent>;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;
  let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteSubject = new Subject();

  beforeEach(async () => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getProduct', 'getCatalogDescriptors', 'getSlugUrl']);
    activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {'params': activatedRouteSubject});
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ProductViewScreenComponent],
      providers: [
        { provide: CatalogService, useValue: catalogServiceSpy },
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: activatedRouteSpy
        },
        {
          provide: Router,
          useValue: routerSpy
        },
        provideMarkdown()
      ]
    })
    .compileComponents();

    catalogServiceSpy.getProduct.and.returnValue(of({} as AppShellProduct));
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{slug: 'catalog', id: 'fake'}]);
    catalogServiceSpy.getSlugUrl.and.callFake((id: string) => {return id;});

    fixture = TestBed.createComponent(ProductViewScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to / if there is no id in the route params', fakeAsync(() => {
    activatedRouteSubject.next({});
    tick();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  }));

  it('should navigate to / if the call to retrieve the product fails', fakeAsync(() => {
    catalogServiceSpy.getProduct.and.returnValue(throwError(() => new Error('test')));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    tick();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  }));

  it('should open the product link in a new tab if the product has a link', () => {
    spyOn(window, 'open');
    component.product = { link: 'http://example.com' } as AppShellProduct;
    component.actionButtonFn();
    expect(window.open).toHaveBeenCalledWith('http://example.com', '_blank');
  });

  it('should open the NoRepositoryAccessDialogComponent if the product does not have a link', () => {
    const dialogSpy = spyOn(component.dialog, 'open');
    component.product = {id: btoa('/project/XXX/repo/YYY/catalogItem.yaml')} as AppShellProduct;
    component.actionButtonFn();
    expect(dialogSpy).toHaveBeenCalledWith(NoRepositoryAccessDialogComponent, {
      width: '480px',
      autoFocus: false,
      data: { project: 'XXX' }
    });
  });

  it('should only inform the actionButtonText if the product has a link', () => {
    catalogServiceSpy.getProduct.and.returnValue(of({link: 'http://link.com'} as AppShellProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionButtonText).toEqual('View Code');
    catalogServiceSpy.getProduct.and.returnValue(of({link: undefined} as AppShellProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionButtonText).toBeUndefined();
  });
  
  it('base64URLDecode should decode base64 URL encoded string with no padding', () => {
    const input = 'SGVsbG8gd29ybGQ';
    const expectedOutput = 'Hello world';
    expect(component.base64URLDecode(input)).toBe(expectedOutput);
  });
  
  it('base64URLDecode should decode base64 URL encoded string with one padding character', () => {
    const input = 'SGVsbG8gd29ybGQ';
    const expectedOutput = 'Hello world';
    expect(component.base64URLDecode(input)).toBe(expectedOutput);
  });
  
  it('base64URLDecode should decode base64 URL encoded string with two padding characters', () => {
    const input = 'SGVsbG8gd29ybG';
    const expectedOutput = 'Hello worl';
    expect(component.base64URLDecode(input)).toBe(expectedOutput);
  });
  
  it('base64URLDecode should decode base64 URL encoded string with hyphens and underscores', () => {
    const input = 'SGVsbG-_';
    const expectedOutput = 'Hello¿';
    expect(component.base64URLDecode(input)).toBe(expectedOutput);
  });
  
  it('base64URLDecode should handle empty string', () => {
    const input = '';
    const expectedOutput = '';
    expect(component.base64URLDecode(input)).toBe(expectedOutput);
  });  
  
  it('base64URLDecode should return the same string if the length is not valid to be decoded', () => {
    const input = 'SGVsbG8-_';
    const expectedOutput = 'SGVsbG8-_';
    expect(component.base64URLDecode(input)).toBe(expectedOutput);
  });  
    
});