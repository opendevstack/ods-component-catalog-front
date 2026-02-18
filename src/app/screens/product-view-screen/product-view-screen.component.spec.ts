import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ProductViewScreenComponent } from './product-view-screen.component';
import { CatalogService } from '../../services/catalog.service';
import { provideHttpClient } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
import { NoRepositoryAccessDialogComponent } from '../../components/no-repository-access-dialog/no-repository-access-dialog.component';
import { AppProduct } from '../../models/app-product';
import { ProductAction } from '../../models/product-action';
import { ProjectService } from '../../services/project.service';
import { AppProject } from '../../models/project';

describe('ProductViewScreenComponent', () => {
  let component: ProductViewScreenComponent;
  let fixture: ComponentFixture<ProductViewScreenComponent>;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
  let routerSpy: jasmine.SpyObj<Router>;
  const activatedRouteSubject = new Subject();
  const projectSubject = new Subject<AppProject>();

  beforeEach(async () => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getProduct', 'getCatalogDescriptors', 'getSlugUrl', 'getProjectProduct', 'setSelectedCatalogSlug']);
    activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {'params': activatedRouteSubject});
    projectServiceSpy = jasmine.createSpyObj('ProjectService', ['getCurrentProject'], { project$: projectSubject.asObservable() });
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
        {
          provide: ProjectService,
          useValue: projectServiceSpy
        },
        provideMarkdown()
      ]
    })
    .compileComponents();

    catalogServiceSpy.getProduct.and.returnValue(of({} as AppProduct));
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{slug: 'catalog', id: 'fake'}]);
    catalogServiceSpy.getSlugUrl.and.callFake((id: string) => {return id;});

    fixture = TestBed.createComponent(ProductViewScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    projectSubject.next({ projectKey: 'project 1', location: 'location 1' } as AppProject);
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

  it('should call viewCodeAction in actionButtonFn if the first action is of type code', () => {
    spyOn(window, 'open');
    spyOn(component, 'viewCodeAction');
    component.product = { actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://example.com'}] } as AppProduct;
    component.actionButtonFn();
    expect(component.viewCodeAction).toHaveBeenCalledWith({id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://example.com'} as ProductAction);
  });

  it('should call genericAction in actionButtonFn if the first action is not of type code', () => {
    spyOn(component, 'genericAction');
    component.product = {id: btoa('/project/XXX/repo/YYY/catalogItem.yaml'), actions: [{id: 'other', url: null}]} as AppProduct;
    component.actionButtonFn();
    expect(component.genericAction).toHaveBeenCalledWith({id: 'other', url: null} as ProductAction);
  });

  it('should call viewCodeAction in secondaryActionButtonFn if there are 2 actions and the second action is of type code', () => {
    spyOn(window, 'open');
    spyOn(component, 'viewCodeAction');
    component.product = { actions: [{id: 'other', url: null}, {id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://example.com'}] } as AppProduct;
    component.secondaryActionButtonFn();
    expect(component.viewCodeAction).toHaveBeenCalledWith({id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://example.com'} as ProductAction);
  });

  it('should call genericAction in secondaryActionButtonFn if there are 2 actions and the second action is not of type code', () => {
    spyOn(component, 'genericAction');
    component.product = {id: btoa('/project/XXX/repo/YYY/catalogItem.yaml'), actions: [{id: 'one', url: null}, {id: 'other', url: null}]} as AppProduct;
    component.secondaryActionButtonFn();
    expect(component.genericAction).toHaveBeenCalledWith({id: 'other', url: null} as ProductAction);
  });

  it('should open the product link in a new tab if the product has a link in viewCodeAction', () => {
    spyOn(window, 'open');
    component.viewCodeAction({id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://example.com'} as ProductAction);
    expect(window.open).toHaveBeenCalledWith('http://example.com', '_blank');
  });

  it('should open the NoRepositoryAccessDialogComponent if the product does not have a link in viewCodeAction', () => {
    const dialogSpy = spyOn(component.dialog, 'open');
    component.product = {id: btoa('/project/XXX/repo/YYY/catalogItem.yaml'), actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: null}]} as AppProduct;
    component.viewCodeAction({id: CatalogService.CODE_PRODUCT_TYPE, url: null} as ProductAction);
    expect(dialogSpy).toHaveBeenCalledWith(NoRepositoryAccessDialogComponent, {
      width: '480px',
      autoFocus: false,
      data: { project: 'XXX' }
    });
  });

  it('should only inform the actionButtonText if the product has actions', () => {
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code',}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionButton).toEqual({'label': 'View Code', disabled: true, tooltip: undefined});
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [] as ProductAction[]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionButton).toBeUndefined();
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code', requestable: true, restrictionMessage: ''}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionButton).toEqual({'label': 'View Code', disabled: false, tooltip: ''});
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code', requestable: false, restrictionMessage: 'Some text'}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionButton).toEqual({'label': 'View Code', disabled: true, tooltip: 'Some text'});
  });
  
  it('should only inform the secondaryActionButtonText if the product has exactly 2 actions', () => {
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code'}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.secondaryActionButton).toBeUndefined();
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code'}, {id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'Action Two'}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.secondaryActionButton).toEqual({'label': 'Action Two', disabled: true, tooltip: undefined});
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code'}, {id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'Action Two', requestable: true, restrictionMessage: ''}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.secondaryActionButton).toEqual({'label': 'Action Two', disabled: false, tooltip: ''});
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code'}, {id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'Action Two', requestable: false, restrictionMessage: 'Some text'}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.secondaryActionButton).toEqual({'label': 'Action Two', disabled: true, tooltip: 'Some text'});
  });
  
  it('should inform the actionPicker if the product has more than 2 actions', () => {
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code'}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionPicker).toBeUndefined();
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'View Code'}, {id: CatalogService.CODE_PRODUCT_TYPE, url: 'http://link.com', label: 'Action Two'}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionPicker).toBeUndefined();
    catalogServiceSpy.getProduct.and.returnValue(of({actions: [{id: '1', url: 'http://link.com', label: 'Action One'}, {id: '2', url: 'http://link.com', label: 'Action Two'}, {id: '3', url: 'http://link.com', label: 'Action Three'}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    expect(component.actionPicker).toEqual({
      label: 'More actions',
      options: ['Action Two', 'Action Three']
    });
  });

  it('should call viewCodeAction if picked action is of type code', () => {
    spyOn(component, 'viewCodeAction');
    component.product = {
      actions: [
        { id: 'other', label: 'Action One', url: null },
        { id: CatalogService.CODE_PRODUCT_TYPE, label: 'View Code', url: 'http://example.com' }
      ]
    } as AppProduct;
    component.actionPickerFn('View Code');
    expect(component.viewCodeAction).toHaveBeenCalledWith(
      { id: CatalogService.CODE_PRODUCT_TYPE, label: 'View Code', url: 'http://example.com' } as ProductAction
    );
  });

  it('should call genericAction if picked action is not of type code', () => {
    spyOn(component, 'genericAction');
    component.product = {
      actions: [
        { id: 'other', label: 'Action One', url: null },
        { id: 'another', label: 'Do Something', url: 'http://example.com' }
      ]
    } as AppProduct;
    component.actionPickerFn('Do Something');
    expect(component.genericAction).toHaveBeenCalledWith(
      { id: 'another', label: 'Do Something', url: 'http://example.com' } as ProductAction
    );
  });

  it('should do nothing if picked action is not found', () => {
    spyOn(component, 'viewCodeAction');
    spyOn(component, 'genericAction');
    component.product = {
      actions: [
        { id: 'other', label: 'Action One', url: null }
      ]
    } as AppProduct;
    component.actionPickerFn('Nonexistent Action');
    expect(component.viewCodeAction).not.toHaveBeenCalled();
    expect(component.genericAction).not.toHaveBeenCalled();
  });

  it('should do nothing if product.actions is undefined', () => {
    spyOn(component, 'viewCodeAction');
    spyOn(component, 'genericAction');
    component.product = {} as AppProduct;
    component.actionPickerFn('Any Action');
    expect(component.viewCodeAction).not.toHaveBeenCalled();
    expect(component.genericAction).not.toHaveBeenCalled();
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

  it('should navigate to the action id in lowercase relative to the current route in genericAction', () => {
    const action: ProductAction = { id: 'SOMEACTION', url: null, label: 'Some Action' } as ProductAction;
    component.genericAction(action);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['someaction'], { relativeTo: activatedRouteSpy });
  });

  it('should handle action id with mixed case and special characters in genericAction', () => {
    const action: ProductAction = { id: 'Do-Thing_123', url: null, label: 'Do Thing' } as ProductAction;
    component.genericAction(action);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['do-thing_123'], { relativeTo: activatedRouteSpy });
  });

  it('should call getProjectProduct when current project is available', fakeAsync(() => {
    projectServiceSpy.getCurrentProject.calls.reset();
    catalogServiceSpy.getProjectProduct.calls.reset();
    catalogServiceSpy.getProduct.calls.reset();
    const mockProject = { projectKey: 'TEST_PROJECT', } as AppProject;
    projectServiceSpy.getCurrentProject.and.returnValue(mockProject);
    catalogServiceSpy.getProjectProduct.and.returnValue(of({} as AppProduct));
    
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    tick();
    
    expect(projectServiceSpy.getCurrentProject).toHaveBeenCalled();
    expect(catalogServiceSpy.getProjectProduct).toHaveBeenCalledWith('TEST_PROJECT', 'fakeId');
    expect(catalogServiceSpy.getProduct).not.toHaveBeenCalled();
  }));

  it('should call getProduct when current project is not available', fakeAsync(() => {
    projectServiceSpy.getCurrentProject.calls.reset();
    catalogServiceSpy.getProjectProduct.calls.reset();
    catalogServiceSpy.getProduct.calls.reset();
    projectServiceSpy.getCurrentProject.and.returnValue(null);
    catalogServiceSpy.getProduct.and.returnValue(of({} as AppProduct));
    
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    tick();
    
    expect(projectServiceSpy.getCurrentProject).toHaveBeenCalled();
    expect(catalogServiceSpy.getProduct).toHaveBeenCalledWith('fakeId');
    expect(catalogServiceSpy.getProjectProduct).not.toHaveBeenCalled();
  }));
});