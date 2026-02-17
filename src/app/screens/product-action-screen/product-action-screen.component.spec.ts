import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductActionScreenComponent } from './product-action-screen.component';
import { CatalogService } from '../../services/catalog.service';
import { provideHttpClient } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { AppShellToastService } from '@opendevstack/ngx-appshell';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
import { Validators } from '@angular/forms';
import { CatalogDescriptor } from '../../openapi/component-catalog';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { AppProduct } from '../../models/app-product';
import { ProductAction } from '../../models/product-action';
import { ProductActionParameter } from '../../models/product-action-parameter';
import { ProjectService } from '../../services/project.service';
import { AppProject } from '../../models/project';
import { AzureService } from '../../services/azure.service';
import { AppUser } from '../../models/app-user';

describe('ProductActionScreenComponent', () => {
  let component: ProductActionScreenComponent;
  let fixture: ComponentFixture<ProductActionScreenComponent>;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;
  let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
  let routerSpy: jasmine.SpyObj<Router>;
  const activatedRouteSubject = new Subject();
  let toastServiceSpy: jasmine.SpyObj<AppShellToastService>;
  let httpTesting: HttpTestingController;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let azureServiceSpy: jasmine.SpyObj<AzureService>;
  const projectSubject = new Subject<AppProject>();
  const loggedUserSubject = new Subject<AppUser | null>();

  beforeEach(async () => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getProduct', 'getCatalogDescriptors', 'getSlugUrl', 'getProjectProduct', 'setSelectedCatalogSlug']);
    activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {'params': activatedRouteSubject});
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastServiceSpy = jasmine.createSpyObj('AppShellToastService', ['showToast']);
    projectServiceSpy = jasmine.createSpyObj('ProjectService', ['getProject', 'getProjectById'], { project$: projectSubject.asObservable() });
    azureServiceSpy = jasmine.createSpyObj('AzureService', ['getRefreshedAccessToken'], { loggedUser$: loggedUserSubject.asObservable() });

    await TestBed.configureTestingModule({
      imports: [ProductActionScreenComponent],
      providers: [
        { provide: CatalogService, useValue: catalogServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: activatedRouteSpy
        },
        {
          provide: Router,
          useValue: routerSpy
        },
        {
          provide: AppShellToastService,
          useValue: toastServiceSpy
        },
        {
          provide: ProjectService,
          useValue: projectServiceSpy
        },
        {
          provide: AzureService,
          useValue: azureServiceSpy
        },
        provideMarkdown()
      ]
    })
    .compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    const fakeProduct = {
      title: 'fakeProduct',
      actions: [
        {
          id: 'fakeAction',
          label: 'Fake Action',
          requestable: true,
          parameters: [
            {
              name: 'param_1',
              required: true, 
              type: 'string'
            }, 
            {
              name: 'param_2', 
              required: false, 
              type: 'singlelist', 
              options: ['option 1', 'option 2'], 
              defaultValue: 'option 1'
            }, 
            {
              name: 'param_2_b', 
              required: false, 
              type: 'singlelist', 
              options: ['option 1', 'option 2'], 
              defaultValue: 'non-existent option'
            }, 
            {
              name: 'param_3', 
              required: false, 
              type: 'multiplelist', 
              options: ['option 1', 'option 2', 'option 3'], 
              defaultValues: ['option 1', 'option 3', 'non-existent option']
            },
            {
              name: 'param_4', 
              required: false, 
              type: 'multiplelist', 
              options: ['option 1', 'option 2', 'option 3']
            }
          ]
        }
      ]
    } as AppProduct
    catalogServiceSpy.getProduct.and.returnValue(of(fakeProduct));
    catalogServiceSpy.getProjectProduct.and.returnValue(of(fakeProduct));
    catalogServiceSpy.getCatalogDescriptors.and.returnValue([{slug: 'catalog', id: 'fake'}]);
    catalogServiceSpy.getSlugUrl.and.callFake((id: string) => {return id;});
    azureServiceSpy.getRefreshedAccessToken.and.returnValue(of('fakeAccessToken'));

    fixture = TestBed.createComponent(ProductActionScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog'});
    projectSubject.next({ projectKey: 'project 1', location: 'location 1' } as AppProject);
    loggedUserSubject.next({ username: 'test-user' } as AppUser);
    
    component.formGroup = component['fb'].group({
      param_1: ['value1', Validators.required],
      param_2: ['value2']
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to root if no params provided', () => {
    routerSpy.navigate.calls.reset();
    activatedRouteSubject.next({});
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to root if id or catalog are not found', () => {
    routerSpy.navigate.calls.reset();
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'fakeCatalog'});
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to product details if action is not found', () => {
    routerSpy.navigate.calls.reset();
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'nonExistentAction'});
    expect(routerSpy.navigate).toHaveBeenCalledWith([`/catalog/item/fakeId`]);
  });

  it('should set page title and breadcrumb links on init if params and product are well defined', () => {
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    expect(component.pageTitle).toBe('Fake Action fakeProduct');
    expect(component.breadcrumbLinks.length).toBe(3);
    expect(component.breadcrumbLinks[0].label).toBe('Catalogs');
    expect(component.breadcrumbLinks[1].label).toBe('catalog');
    expect(component.breadcrumbLinks[2].label).toBe('fakeProduct');
  });

  it('should set actionParams accordingly to chosen action', () => {
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    expect(component.actionParams.length).toEqual(6); // 5+1 for project_key param added automatically
    catalogServiceSpy.getProduct.and.returnValue(of({title: 'fakeProduct' ,actions: [{id: 'fakeAction', label: 'Fake Action'}]} as AppProduct));
    catalogServiceSpy.getProjectProduct.and.returnValue(of({title: 'fakeProduct' ,actions: [{id: 'fakeAction', label: 'Fake Action', requestable: true}]} as AppProduct));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    expect(component.actionParams.length).toEqual(0);
  });

  it('should navigate to root if product retrieval fails', () => {
    routerSpy.navigate.calls.reset();
    catalogServiceSpy.getProduct.and.returnValue(throwError(() => new Error('test')));
    catalogServiceSpy.getProjectProduct.and.returnValue(throwError(() => new Error('test')));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/page-not-found']);
  });

  it('should navigate to product details page if productCatalog and slug are defined on onCancelClick', () => {
    component.product = { id: 'fakeId' } as AppProduct;
    component.productCatalog = { slug: 'catalog' } as CatalogDescriptor;
    catalogServiceSpy.getSlugUrl.and.callFake((slug: string) => slug);
    component.onCancelClick();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/catalog/item/fakeId']);
  });

  it('should navigate to root and log if productCatalog or slug is not defined on onCancelClick', () => {
    spyOn(console, 'log');
    component.product = { id: 'fakeId' } as AppProduct;
    component.productCatalog = undefined;
    component.onCancelClick();
    expect(console.log).toHaveBeenCalledWith('Cannot retrieve catalog slug for navigation');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to root and log if productCatalog.slug is missing on onCancelClick', () => {
    spyOn(console, 'log');
    component.product = { id: 'fakeId' } as AppProduct;
    component.productCatalog = {} as CatalogDescriptor;
    component.onCancelClick();
    expect(console.log).toHaveBeenCalledWith('Cannot retrieve catalog slug for navigation');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should mark all controls as touched if form is invalid', () => {
    spyOn(console, 'log');
    component.formGroup.get('param_1')?.setValue(''); // Make required field invalid
    const markAllAsTouchedSpy = spyOn(component.formGroup, 'markAllAsTouched').and.callThrough();
    component.onActionClick();
    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalledWith('Action clicked', jasmine.anything());
  });

  it('should send HTTP POST and show toast, then navigate to project components on success', () => {
    component.action = {
      id: 'fakeAction',
      url: '/api/action',
      parameters: [
        { name: 'param_1', type: 'string', required: true },
        { name: 'param_2', type: 'string', required: false, defaultValue: 'default' },
        { name: 'param_3', type: 'multiplelist', required: false, defaultValues: ['default'], options: ['default', 'option 2', 'option 3'] },
        { name: 'param_4', type: 'string', required: false },
        { name: 'param_5', type: 'string', required: false, locations: [{ location: 'location 1', value: 'value_location_1' }, { location: 'location 2', value: 'value_location_2' }] },
        { name: 'param_6', type: 'singlelist', required: false, locations: [{ location: 'location 1', value: 'value_location_1' }, { location: 'location 2', value: 'value_location_2' }], options: ['loc1', 'loc2'] },
      ],
      triggerMessage: 'triggered',
      label: 'Fake Action'
    } as ProductAction;
    component.productCatalog = { slug: 'catalog' } as CatalogDescriptor;
    component.product = { id: 'fakeId', title: 'fakeProduct' } as AppProduct;
    component.selectedProject = { projectKey: 'project 1', location: 'location 1' } as AppProject;
    component.formGroup = component['fb'].group({
      param_1: ['value1', Validators.required],
      component_id: ['ComponentX']
    });
    component.actionParams = component.action.parameters || [];
    loggedUserSubject.next(null);

    component.onActionClick();

    const req: TestRequest = httpTesting.expectOne('/api/action');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      id: 'fakeAction',
      parameters: [
        { name: 'param_1', type: 'string', value: 'value1' },
        { name: 'param_2', type: 'string', value: 'default' },
        { name: 'param_3', type: 'multiplelist', value: ['default'] },
        { name: 'param_4', type: 'string', value: '' },
        { name: 'param_5', type: 'string', value: 'value_location_1' },
        { name: 'param_6', type: 'singlelist', value: '' },
        { name: 'catalog_item_id', type: 'string', value: 'fakeId' },
        { name: 'access_token', type: 'string', value: 'fakeAccessToken' },
        { name: 'caller', type: 'string', value: 'unknown' },
        { name: 'cluster_location', type: 'string', value: 'location 1' }
      ]
    })
    req.flush({});

    expect(toastServiceSpy.showToast).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'ComponentX triggered'
      }),
      8000
    );
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/project 1/components']);
  });

  it('should navigate to root and show toast if productCatalog or slug is missing after action', () => {
    routerSpy.navigate.calls.reset();
    component.action = {
      id: 'fakeAction',
      url: '/api/action',
      triggerMessage: 'triggered',
      label: 'Fake Action'
    } as ProductAction;
    component.productCatalog = undefined;
    component.product = { id: 'fakeId', title: 'fakeProduct' } as AppProduct;
    component.formGroup = component['fb'].group({});

    spyOn(console, 'log');

    component.onActionClick();

    const req: TestRequest = httpTesting.expectOne('/api/action');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      id: 'fakeAction',
      parameters: [
        { name: 'catalog_item_id', type: 'string', value: 'fakeId' },
        { name: 'access_token', type: 'string', value: 'fakeAccessToken' },
        { name: 'caller', type: 'string', value: 'test-user' },
        { name: 'cluster_location', type: 'string', value: 'location 1' }
      ],
    })
    req.flush({});

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/project 1/components']);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should navigate to root if selectedProject is null after successful action', () => {
    routerSpy.navigate.calls.reset();
    component.action = {
      id: 'fakeAction',
      url: '/api/action',
      triggerMessage: 'triggered',
      label: 'Fake Action'
    } as ProductAction;
    component.productCatalog = undefined;
    component.product = { id: 'fakeId', title: 'fakeProduct' } as AppProduct;
    component.formGroup = component['fb'].group({});
    // Set selectedProject to an object without projectKey to trigger the else branch
    component.selectedProject = { location: 'LOC_1' } as AppProject;

    spyOn(console, 'log');

    component.onActionClick();

    const req: TestRequest = httpTesting.expectOne('/api/action');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      id: 'fakeAction',
      parameters: [
        { name: 'catalog_item_id', type: 'string', value: 'fakeId' },
        { name: 'access_token', type: 'string', value: 'fakeAccessToken' },
        { name: 'caller', type: 'string', value: 'test-user' },
        { name: 'cluster_location', type: 'string', value: 'LOC_1' }
      ],
    })
    req.flush({});

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    expect(console.log).toHaveBeenCalledWith('Cannot retrieve catalog slug for navigation');
  });

  it('should show error toast with statusText if HTTP POST fails and statusText is present', () => {
    component.action = {
      id: 'fakeAction',
      url: '/api/action',
      parameters: [
        { name: 'param_1', type: 'string' },
        { name: 'param_2', type: 'string' }
      ],
      triggerMessage: 'triggered',
      label: 'Fake Action'
    } as ProductAction;
    component.productCatalog = { slug: 'catalog' } as CatalogDescriptor;
    component.product = { id: 'fakeId', title: 'fakeProduct' } as AppProduct;
    component.formGroup = component['fb'].group({
      component_id: ['ComponentX'],
      param_1: ['value1'],
      param_2: ['value2']
    });
    component.actionParams = component.action.parameters || [];

    spyOn(console, 'error');

    component.onActionClick();

    const req: TestRequest = httpTesting.expectOne('/api/action');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      id: 'fakeAction',
      parameters: [
        { name: 'param_1', type: 'string', value: 'value1' },
        { name: 'param_2', type: 'string', value: 'value2' },
        { name: 'catalog_item_id', type: 'string', value: 'fakeId' },
        { name: 'access_token', type: 'string', value: 'fakeAccessToken' },
        { name: 'caller', type: 'string', value: 'test-user' },
        { name: 'cluster_location', type: 'string', value: 'location 1' }
      ],
    });

    req.flush('fail', { status: 500, statusText: 'failStatusText' });

    expect(console.error).toHaveBeenCalledWith('Error executing action:', jasmine.any(Object));
    expect(toastServiceSpy.showToast).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Something went wrong. Please try again later.'
      }),
      8000
    );
  });

  it('should show error toast with "Unknown error" if HTTP POST fails and neither statusText is present', () => {
    toastServiceSpy.showToast.calls.reset();
    component.action = {
      id: 'fakeAction',
      url: '/api/action',
      parameters: [
        { name: 'param_1', type: 'string' }
      ],
      triggerMessage: 'triggered',
      label: 'Fake Action'
    } as ProductAction;
    component.productCatalog = { slug: 'catalog' } as CatalogDescriptor;
    component.product = { id: 'fakeId', title: 'fakeProduct' } as AppProduct;
    component.formGroup = component['fb'].group({
      component_id: ['ComponentX'],
      param_1: ['value1']
    });
    component.actionParams = component.action.parameters || [];

    const errorSpy = spyOn(console, 'error');

    errorSpy.calls.reset();

    component.onActionClick();

    const req: TestRequest = httpTesting.expectOne('/api/action');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      id: 'fakeAction',
      parameters: [
        { name: 'param_1', type: 'string', value: 'value1' },
        { name: 'catalog_item_id', type: 'string', value: 'fakeId' },
        { name: 'access_token', type: 'string', value: 'fakeAccessToken' },
        { name: 'caller', type: 'string', value: 'test-user' },
        { name: 'cluster_location', type: 'string', value: 'location 1' }
      ],
    });

    // Simulate error with neither statusText nor message
    req.error(new ProgressEvent('network error!'));

    expect(errorSpy).toHaveBeenCalledWith('Error executing action:', jasmine.any(Object));
    expect(toastServiceSpy.showToast).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Something went wrong. Please try again later.'
      }),
      8000
    );
  });

  it('should mark all controls as touched if form is invalid and not call HTTP POST', () => {
    component.action = {
      id: 'fakeAction',
      url: '/api/action',
      parameters: [
        { name: 'param_1', type: 'string', required: true }
      ],
      triggerMessage: 'triggered',
      label: 'Fake Action'
    } as ProductAction;
    component.productCatalog = { slug: 'catalog' } as CatalogDescriptor;
    component.product = { id: 'fakeId', title: 'fakeProduct' } as AppProduct;
    component.formGroup = component['fb'].group({
      param_1: ['', Validators.required]
    });

    const markAllAsTouchedSpy = spyOn(component.formGroup, 'markAllAsTouched').and.callThrough();

    component.onActionClick();

    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(toastServiceSpy.showToast).not.toHaveBeenCalled();
  });

  it('should create custom validators for parameters with validations', () => {
    const mockProductWithValidations = {
      title: 'fakeProduct',
      actions: [{
        id: 'fakeAction', 
        label: 'Fake Action',
        requestable: true,
        parameters: [
          {
            name: 'param_1', 
            required: true, 
            validations: [
              { regex: '^[A-Z]+$', errorMessage: 'Must be uppercase letters only' },
              { regex: '^.{3,}$', errorMessage: 'Must be at least 3 characters' }
            ]
          }
        ]
      }]
    } as AppProduct;

    catalogServiceSpy.getProduct.and.returnValue(of(mockProductWithValidations));
    catalogServiceSpy.getProjectProduct.and.returnValue(of(mockProductWithValidations));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});

    const control = component.formGroup.get('param_1');
    expect(control).toBeTruthy();

    // Test invalid value (lowercase)
    control?.setValue('abc');
    control?.markAsTouched();
    expect(control?.invalid).toBeTruthy();
    expect(control?.hasError('customValidation')).toBeTruthy();

    // Test valid value
    control?.setValue('ABC');
    expect(control?.valid).toBeTruthy();
  });

  it('should have a fallback message for validations without message defined', () => {
    const mockProductWithValidations = {
      title: 'fakeProduct',
      actions: [{
        id: 'fakeAction', 
        label: 'Fake Action', 
        requestable: true,
        parameters: [
          {
            name: 'param_1', 
            required: true, 
            validations: [
              { regex: '^[A-Z]+$' },
            ]
          }
        ]
      }]
    } as AppProduct;

    catalogServiceSpy.getProduct.and.returnValue(of(mockProductWithValidations));
    catalogServiceSpy.getProjectProduct.and.returnValue(of(mockProductWithValidations));
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});

    const control = component.formGroup.get('param_1');
    expect(control).toBeTruthy();

    // Test invalid value (lowercase)
    control?.setValue('abc');
    control?.markAsTouched();
    expect(control?.invalid).toBeTruthy();
    expect(control?.hasError('customValidation')).toBeTruthy();
    expect(control?.getError('customValidation').messages).toContain('Invalid value not matching ^[A-Z]+$');
  });

  it('should handle invalid regex patterns gracefully', () => {
    const mockProductWithInvalidRegex = {
      title: 'fakeProduct',
      actions: [{
        id: 'fakeAction', 
        label: 'Fake Action', 
        requestable: true,
        parameters: [
          {
            name: 'param_1', 
            required: false, 
            validations: [
              { regex: '[invalid(regex', errorMessage: 'This should not be reached' }
            ]
          }
        ]
      }]
    } as AppProduct;

    catalogServiceSpy.getProduct.and.returnValue(of(mockProductWithInvalidRegex));
    catalogServiceSpy.getProjectProduct.and.returnValue(of(mockProductWithInvalidRegex));
    const consoleSpy = spyOn(console, 'error');
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});

    const control = component.formGroup.get('param_1');
    control?.setValue('test');
    control?.markAsTouched();

    expect(control?.invalid).toBeTruthy();
    expect(control?.hasError('customValidation')).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalledWith('Invalid regex pattern:', '[invalid(regex', jasmine.any(Error));
  });

  it('getValidationErrors should return empty array if control does not exist', () => {
    component.actionParams = [
      {
        name: 'param_1',
        required: true,
        hint: 'Hint for param_1'
      } as ProductActionParameter,
      {
        name: 'param_2',
        required: false,
        hint: 'Hint for param_2'
      } as ProductActionParameter
    ];
    component.formGroup = component['fb'].group({
      param_1: ['', Validators.required],
      param_2: ['']
    });
    expect(component.getValidationErrors('nonexistent')).toEqual([]);
  });

  it('getValidationErrors should return empty array if control has no errors', () => {
    component.actionParams = [
      {
        name: 'param_1',
        required: true,
        hint: 'Hint for param_1'
      } as ProductActionParameter,
      {
        name: 'param_2',
        required: false,
        hint: 'Hint for param_2'
      } as ProductActionParameter
    ];
    component.formGroup = component['fb'].group({
      param_1: ['', Validators.required],
      param_2: ['']
    });
    const control = component.formGroup.get('param_1');
    control?.setValue('some value');
    control?.markAsTouched();
    expect(component.getValidationErrors('param_1')).toEqual([]);
  });

  it('getValidationErrors should return empty array if control is not touched', () => {
    component.actionParams = [
      {
        name: 'param_1',
        required: true,
        hint: 'Hint for param_1'
      } as ProductActionParameter,
      {
        name: 'param_2',
        required: false,
        hint: 'Hint for param_2'
      } as ProductActionParameter
    ];
    component.formGroup = component['fb'].group({
      param_1: ['', Validators.required],
      param_2: ['']
    });
    const control = component.formGroup.get('param_1');
    control?.setValue('');
    // not marking as touched
    expect(component.getValidationErrors('param_1')).toEqual([]);
  });

  it('getValidationErrors should return required error message if control is required and empty', () => {
    component.actionParams = [
      {
        name: 'param_1',
        required: true,
        hint: 'Hint for param_1'
      } as ProductActionParameter,
      {
        name: 'param_2',
        required: false,
        hint: 'Hint for param_2'
      } as ProductActionParameter
    ];
    component.formGroup = component['fb'].group({
      param_1: ['', Validators.required],
      param_2: ['']
    });
    const control = component.formGroup.get('param_1');
    control?.setValue('');
    control?.markAsTouched();
    expect(component.getValidationErrors('param_1')).toContain('This field is mandatory');
  });

  it('getValidationErrors should return custom validation messages if present', () => {
    component.actionParams = [
      {
        name: 'param_1',
        required: true,
        hint: 'Hint for param_1'
      } as ProductActionParameter,
      {
        name: 'param_2',
        required: false,
        hint: 'Hint for param_2'
      } as ProductActionParameter
    ];
    component.formGroup = component['fb'].group({
      param_1: ['', Validators.required],
      param_2: ['']
    });
    const control = component.formGroup.get('param_2');
    control?.setErrors({
      customValidation: {
        messages: ['Custom error 1', 'Custom error 2']
      }
    });
    control?.markAsTouched();
    expect(component.getValidationErrors('param_2')).toEqual(['Custom error 1', 'Custom error 2']);
  });

  it('getValidationErrors should return custom validation message (legacy "message" property)', () => {
    component.actionParams = [
      {
        name: 'param_1',
        required: true,
        hint: 'Hint for param_1'
      } as ProductActionParameter,
      {
        name: 'param_2',
        required: false,
        hint: 'Hint for param_2'
      } as ProductActionParameter
    ];
    component.formGroup = component['fb'].group({
      param_1: ['', Validators.required],
      param_2: ['']
    });
    const control = component.formGroup.get('param_2');
    control?.setErrors({
      customValidation: {
        message: 'Legacy custom error'
      }
    });
    control?.markAsTouched();
    expect(component.getValidationErrors('param_2')).toEqual(['Legacy custom error']);
  });

  it('getValidationErrors should return hint if no specific errors found', () => {
    component.actionParams = [
      {
        name: 'param_1',
        required: true,
        hint: 'Hint for param_1'
      } as ProductActionParameter,
      {
        name: 'param_2',
        required: false,
        hint: 'Hint for param_2'
      } as ProductActionParameter
    ];
    component.formGroup = component['fb'].group({
      param_1: ['', Validators.required],
      param_2: ['']
    });
    const control = component.formGroup.get('param_2');
    control?.setErrors({});
    control?.markAsTouched();
    expect(component.getValidationErrors('param_2')).toEqual(['Hint for param_2']);
  });

  it('getValidationErrors should return default "Invalid value" if no hint or errors found', () => {
    component.actionParams = [
      { name: 'param_2', required: false } as ProductActionParameter
    ];
    component.formGroup = component['fb'].group({
      param_2: ['']
    });
    const control = component.formGroup.get('param_2');
    control?.setErrors({});
    control?.markAsTouched();
    expect(component.getValidationErrors('param_2')).toEqual(['Invalid value']);
  });
  
  it('should initialize with project subscription and update project_key param', () => {
    const mockProject: AppProject = { projectKey: 'new-project', location: 'location 1' } as AppProject;
    
    // Reset and setup
    catalogServiceSpy.getProduct.and.returnValue(of({
      title: 'fakeProduct',
      actions: [
        {
          id: 'fakeAction',
          label: 'Fake Action',
          parameters: [
            {
              name: 'param_1',
              required: true,
              type: 'string'
            }
          ]
        }
      ]
    } as AppProduct));

    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    
    // Emit new project
    projectSubject.next(mockProject);
    
    // Verify project_key param was updated
    const projectKeyParam = component.actionParams.find(p => p.name === 'project_key');
    expect(projectKeyParam?.defaultValue).toBe('new-project');
    expect(component.selectedProject).toEqual(mockProject);
  });

  it('should update form controls when project changes', () => {
    const mockProject: AppProject = { projectKey: 'updated-project', location: 'location 1' } as AppProject;
    
    catalogServiceSpy.getProduct.and.returnValue(of({
      title: 'fakeProduct',
      actions: [
        {
          id: 'fakeAction',
          label: 'Fake Action',
          parameters: [
            {
              name: 'param_1',
              required: true,
              type: 'string'
            }
          ]
        }
      ]
    } as AppProduct));

    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    
    // Change project
    projectSubject.next(mockProject);
    
    // Verify form was re-initialized
    const projectKeyControl = component.formGroup.get('project_key');
    expect(projectKeyControl?.value).toBe('updated-project');
  });

  it('should add project_key parameter with correct properties when action has parameters', () => {
    const mockProject: AppProject = { projectKey: 'test-project', location: 'location 1' } as AppProject;
    projectSubject.next(mockProject);
    
    catalogServiceSpy.getProduct.and.returnValue(of({
      title: 'fakeProduct',
      actions: [
        {
          id: 'fakeAction',
          label: 'Fake Action',
          parameters: [
            {
              name: 'param_1',
              required: true,
              type: 'string'
            }
          ]
        }
      ]
    } as AppProduct));

    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    
    const projectKeyParam = component.actionParams.find(p => p.name === 'project_key');
    expect(projectKeyParam).toBeDefined();
    expect(projectKeyParam?.type).toBe('string');
    expect(projectKeyParam?.required).toBe(true);
    expect(projectKeyParam?.label).toBe('Project key');
    expect(projectKeyParam?.visible).toBe(true);
    expect(projectKeyParam?.disabled).toBe(true);
    expect(projectKeyParam?.hint).toContain('project selector in the header');
  });

  it('should filter out existing project_key parameter before adding new one', () => {
    catalogServiceSpy.getProduct.and.returnValue(of({
      title: 'fakeProduct',
      actions: [
        {
          id: 'fakeAction',
          label: 'Fake Action',
          parameters: [
            {
              name: 'project_key',
              type: 'string',
              required: false
            },
            {
              name: 'param_1',
              required: true,
              type: 'string'
            }
          ]
        }
      ]
    } as AppProduct));

    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    
    const projectKeyParams = component.actionParams.filter(p => p.name === 'project_key');
    expect(projectKeyParams.length).toBe(1);
    expect(projectKeyParams[0].required).toBe(true); // Should use the new one
  });

  it('should unsubscribe from project$ on destroy', () => {
    const destroyingSpy = spyOn(component['_destroying$'], 'next');
    const completeSpy = spyOn(component['_destroying$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(destroyingSpy).toHaveBeenCalledWith(undefined);
    expect(completeSpy).toHaveBeenCalled();
  });
  
  it('should set project_key defaultValue to empty string when no project is selected and parameters exist', () => {
    // Manually set actionParams to simulate the state when project is null
    component.selectedProject = null;
    component.actionParams = [
      {
        name: 'project_key',
        type: 'string',
        required: true,
        defaultValue: '',
        label: 'Project key',
        visible: true,
        disabled: true
      } as ProductActionParameter
    ];
    
    const projectKeyParam = component.actionParams.find(p => p.name === 'project_key');
    expect(projectKeyParam?.defaultValue).toBe('');
  });

  it('should redirect to page-not-found when selectedProject is null', () => {
    routerSpy.navigate.calls.reset();
    component.selectedProject = null;
    
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/page-not-found']);
  });

  it('should redirect to page-not-found when requestable is false', () => {
    routerSpy.navigate.calls.reset();
    
    const mockProductWithNonRequestableAction = {
      id: 'fakeId',
      title: 'fakeProduct',
      shortDescription: 'Short description',
      description: 'Description',
      authors: [],
      actions: [
        {
          id: 'fakeAction',
          label: 'Fake Action',
          requestable: false,
          restrictionMessage: 'This action is not available',
          parameters: []
        }
      ]
    } as unknown as AppProduct;

    catalogServiceSpy.getProjectProduct.and.returnValue(of(mockProductWithNonRequestableAction));
    
    activatedRouteSubject.next({'id': 'fakeId', 'catalogSlug': 'catalog', 'action': 'fakeAction'});
    
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/page-not-found']);
  });

  it('should not call onActionClick when selectedProject is null', () => {
    component.selectedProject = null;
    component.action = {
      id: 'fakeAction',
      url: '/api/action',
      parameters: [],
      triggerMessage: 'triggered',
      label: 'Fake Action',
      requestable: true,
      restrictionMessage: ''
    } as ProductAction;
    component.productCatalog = { slug: 'catalog' } as CatalogDescriptor;
    component.product = { id: 'fakeId', title: 'fakeProduct' } as AppProduct;
    component.formGroup = component['fb'].group({});
    component.actionParams = [];

    component.onActionClick();

    httpTesting.expectNone('/api/action');
    expect(component.formGroup.touched).toBe(true);
  });

  it('should not show trigger message toast if triggerMessage is empty', () => {
    toastServiceSpy.showToast.calls.reset();
    routerSpy.navigate.calls.reset();
    
    component.action = {
      id: 'fakeAction',
      url: '/api/action',
      parameters: [],
      triggerMessage: '',
      label: 'Fake Action',
      requestable: true,
      restrictionMessage: ''
    } as ProductAction;
    component.productCatalog = { slug: 'catalog' } as CatalogDescriptor;
    component.product = { id: 'fakeId', title: 'fakeProduct' } as AppProduct;
    component.selectedProject = { projectKey: 'project 1', location: 'location 1' } as AppProject;
    component.formGroup = component['fb'].group({});
    component.actionParams = [];

    component.onActionClick();

    const req: TestRequest = httpTesting.expectOne('/api/action');
    req.flush({});

    expect(toastServiceSpy.showToast).not.toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/project 1/components']);
  });
});
