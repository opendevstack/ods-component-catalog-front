import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AppShellLink, AppShellPageHeaderComponent, AppShellToastService, AppShellNotification, AppShellIconComponent } from '@opendevstack/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CatalogDescriptor } from '../../openapi/component-catalog';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductAction } from '../../models/product-action';
import { ProductActionParameter } from '../../models/product-action-parameter';
import { AppProduct } from '../../models/app-product';
import { ProductActionParameterValidation } from '../../models/product-action-parameter-validation';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ProjectService } from '../../services/project.service';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { AppProject } from '../../models/project';
import { AzureService } from '../../services/azure.service';
import { AppUser } from '../../models/app-user';

@Component({
  selector: 'app-product-action-screen',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, AppShellPageHeaderComponent, MatButtonModule, MatProgressSpinnerModule, MatSelectModule, MatOptionModule, AppShellIconComponent],
  templateUrl: './product-action-screen.component.html',
  styleUrl: './product-action-screen.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProductActionScreenComponent implements OnInit, OnDestroy {

  breadcrumbLinks: AppShellLink[] = []
  pageTitle = '';
  product: AppProduct = {} as AppProduct;
  productCatalog?: CatalogDescriptor;
  productId?: string;
  actionId?: string;

  action: ProductAction = {} as ProductAction;
  actionParams: ProductActionParameter[] = [];

  formGroup: FormGroup;

  isExecutingAction = false;

  selectedProject: AppProject | null = null;

  projectKeyVariableName = 'project_key';
  loggedUser: AppUser | null = null;

  private readonly _destroying$ = new Subject<void>();

  constructor(
    private readonly catalogService: CatalogService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastService: AppShellToastService,
    public dialog: MatDialog,
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
    private readonly projectService: ProjectService,
    private readonly azureService: AzureService
  ) {
    this.formGroup = this.fb.group({});
  }

  ngOnInit() {
    this.subscribeToProjectChanges();
    this.subscribeToRouteParams();
    this.azureService.loggedUser$.pipe(takeUntil(this._destroying$)).subscribe(user => {
      this.loggedUser = user;
    });
  }

  private subscribeToProjectChanges(): void {
    this.projectService.project$
      .pipe(takeUntil(this._destroying$))
      .subscribe((project: AppProject | null) => {
        this.selectedProject = project;
        if (project != null) {
          this.updateProjectKeyParam(project);
        }
        if (this.productCatalog && this.productId && this.actionId) {
          this.loadProductAndAction(this.productCatalog, this.productId, this.actionId);
        }
      });
  }

  private updateProjectKeyParam(project: AppProject): void {
    this.actionParams = this.actionParams.map(param => {
      if (param.name === 'project_key') {
        return { ...param, defaultValue: project.projectKey };
      }
      return param;
    });
    this.initForm(this.actionParams);
  }

  private subscribeToRouteParams(): void {
    this.route.params
      .pipe(takeUntil(this._destroying$))
      .subscribe(params => {
      const catalogSlug = params['catalogSlug'] || '';
      this.productId = params['id'] || '';
      this.actionId = params['action'] || '';

      this.catalogService.setSelectedCatalogSlug(catalogSlug);

      const catalog = this.catalogService.getCatalogDescriptors()
        .find(catalog => this.catalogService.getSlugUrl(catalog.slug!) === catalogSlug);

      if (!this.validateRouteParams(this.productId!, catalog)) {
        return;
      }

      this.productCatalog = catalog;
      this.loadProductAndAction(this.productCatalog!, this.productId!, this.actionId!);
    });
  }

  private validateRouteParams(productId: string, catalog: CatalogDescriptor | undefined): boolean {
    if (productId === '' || !catalog) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }

  private loadProductAndAction(catalog: CatalogDescriptor, productId: string, action: string): void {
    if (!this.selectedProject) {
      this.router.navigate(['/page-not-found']);
      return;
    }

    const productObservable = this.catalogService.getProjectProduct(this.selectedProject.projectKey, productId);

    productObservable.subscribe({
      next: (product) => {
        this.product = product;

        const productAction = product.actions?.find(a => a.id.toLowerCase() === action.toLowerCase());
        if (!this.validateProductAction(catalog, productId, action, productAction)) {
          return;
        }

        if (!productAction?.requestable) {
          this.router.navigate(['/page-not-found']);
          return;
        }

        this.action = productAction!;
        this.setupPageHeader(productAction!, product, catalog);
        this.setupActionParameters(productAction!);
      },
      error: () => {
        console.log('Error loading product');
        this.router.navigate(['/page-not-found']);
      }
    });
  }

  private validateProductAction(
    catalog: CatalogDescriptor,
    productId: string,
    action: string,
    productAction: ProductAction | undefined
  ): boolean {
    if (action === '' || !productAction) {
      this.router.navigate([`/${this.catalogService.getSlugUrl(catalog.slug!)}/item/${productId}`]);
      return false;
    }
    return true;
  }

  private setupPageHeader(productAction: ProductAction, product: AppProduct, catalog: CatalogDescriptor): void {
    this.pageTitle = `${productAction.label} ${product.title}`;

    this.breadcrumbLinks = [
      {
        anchor: '',
        label: 'Catalogs',
      },
      {
        anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}`,
        label: catalog.slug!,
      },
      {
        anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}/item/${product.id}`,
        label: product.title,
      }
    ];
  }

  private setupActionParameters(productAction: ProductAction): void {
    const productActionParams = productAction.parameters?.filter(param => param.name !== 'project_key') || [];
    
    if (productActionParams.length > 0) {
      this.addProjectKeyParameter(productActionParams);
    }
    
    this.initForm(productActionParams);
    this.actionParams = productActionParams;
  }

  private addProjectKeyParameter(params: ProductActionParameter[]): void {
    params.unshift({
      name: 'project_key',
      type: 'string',
      required: true,
      defaultValue: this.selectedProject!.projectKey,
      label: 'Project key',
      hint: 'If you need to change the project selected, use the project selector in the header.',
      visible: true,
      disabled: true
    });
  }

  private initForm(actionParams?: Array<ProductActionParameter>) {
    this.formGroup = this.fb.group({});
    
    if (!actionParams || actionParams.length === 0) {
      return;
    }

    const parameters = [...actionParams];
    for (const param of parameters) {
      const formControl = this.createFormControlForParam(param);
      this.formGroup.addControl(param.name, formControl);
    }
  }

  private createFormControlForParam(param: ProductActionParameter) {
    const validators = this.getValidatorsForParam(param);
    const formControl = this.fb.control(
      this.getParamDefaultValue(param), 
      validators.length > 0 ? validators : null
    );
    
    if (param.disabled) {
      formControl.disable();
    }
    
    return formControl;
  }

  private getValidatorsForParam(param: ProductActionParameter): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (param.required) {
      validators.push(Validators.required);
    }

    if (param.validations && param.validations.length > 0) {
      validators.push(this.createCustomValidator(param.validations));
    }

    return validators;
  }

  private getParamDefaultValue(param: ProductActionParameter): string | string[] | null | undefined {
    let defaultValue: string | string[] | null | undefined;
    if (param.type === 'multiplelist') {
      defaultValue = param.defaultValues?.filter(v => param.options?.includes(v)) || [];
    } else if (param.type === 'singlelist') {
      let defaultOption;
      if (param.locations && param.locations.length > 0) {
        defaultOption = param.locations.find(loc => loc.location == this.selectedProject?.location)?.value;
      } else {
        defaultOption = param.defaultValue;
      }
      if (defaultOption != null && param.options?.includes(defaultOption)) {
        defaultValue = defaultOption;
      } else {
        defaultValue = null;
      }
    } else if (param.locations && param.locations.length > 0) {
      defaultValue = param.locations.find(loc => loc.location == this.selectedProject?.location)?.value;
    } else {
      defaultValue = param.defaultValue;
    }
    return defaultValue;
  }

  onCancelClick() {
    if (this.productCatalog?.slug) {
      this.router.navigate([`/${this.catalogService.getSlugUrl(this.productCatalog?.slug)}/item/${this.product.id}`]);
    } else {
      console.log('Cannot retrieve catalog slug for navigation');
      this.router.navigate(['/']);
    }
  }

  private createCustomValidator(validations: Array<ProductActionParameterValidation>): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values with custom validators (required validator handles that)
      }

      const value = control.value.toString();
      const failedValidations: string[] = [];

      for (const validation of validations) {
        try {
          const regex = new RegExp(validation.regex);
          if (!regex.test(value)) {
            const errorMessage = validation.errorMessage != '' && validation.errorMessage != null ? validation.errorMessage : `Invalid value not matching ${validation.regex}`;
            failedValidations.push(errorMessage);
          }
        } catch (error) {
          console.error('Invalid regex pattern:', validation.regex, error);
          failedValidations.push(`Invalid validation pattern ${validation.regex}`);
        }
      }

      if (failedValidations.length > 0) {
        return { customValidation: { messages: failedValidations } };
      }

      return null; // All validations passed
    };
  }

  getValidationErrors(controlName: string): string[] {
    const control = this.formGroup.get(controlName);
    if (!control?.errors || !control.touched) {
      return [];
    }

    const errorMessages: string[] = [];

    if (control.hasError('required')) {
      errorMessages.push('This field is mandatory');
    }

    if (control.hasError('customValidation')) {
      const customErrors = control.errors['customValidation'];
      if (customErrors.messages && Array.isArray(customErrors.messages)) {
        errorMessages.push(...customErrors.messages);
      } else if (customErrors.message) {
        // Fallback for backward compatibility
        errorMessages.push(customErrors.message);
      }
    }

    // If no specific errors found, fallback to hint
    if (errorMessages.length === 0) {
      const param = this.actionParams.find(p => p.name === controlName);
      const hint = param?.hint ?? 'Invalid value';
      return [hint];
    }

    return errorMessages;
  }

  onActionClick() {
    if (this.formGroup.valid && this.action.url && this.selectedProject) {
      this.isExecutingAction = true;
      const actionUrl = this.action.url;
      this.azureService.getRefreshedAccessToken().pipe(
        switchMap((refreshedAccessToken: string) => {
          const actionBody = {
            id: this.action.id,
            parameters: this.actionParams.map(param => ({
              name: param.name,
              type: param.type,
              value: this.formGroup.getRawValue()[param.name] || this.getParamDefaultValue(param) || ''
            })),
          };
          actionBody.parameters.push({
            name: 'catalog_item_id',
            type: 'string',
            value: this.product.id
          });
          actionBody.parameters.push({
            name: 'access_token',
            type: 'string',
            value: refreshedAccessToken
          });
          actionBody.parameters.push({
            name: 'caller',
            type: 'string',
            value: this.loggedUser?.username || 'unknown'
          });
          actionBody.parameters.push({
            name: 'cluster_location',
            type: 'string',
            value: this.selectedProject!.location
          });
          this.formGroup.disable();
          return this.http.post(actionUrl, actionBody);
        })
      ).subscribe({
        next: () => {
          if(this.action.triggerMessage && this.action.triggerMessage !== '') {
            this.toastService.showToast({
              id: '',
              read: false,
              subject: 'only_toast',
              title: `${this.formGroup.value['component_id'] ?? ''} ${this.action.triggerMessage}`
            } as AppShellNotification, 8000);
          }
          this.isExecutingAction = false;

          if (this.selectedProject?.projectKey) {
            this.router.navigate([`/${this.selectedProject!.projectKey}/components`]);
          } else {
            console.log('Cannot retrieve catalog slug for navigation');
            this.router.navigate(['/']);
          }
        },
        error: (error) => {
          console.error('Error executing action:', error);
          const errorMessage = error?.error?.message || 'Something went wrong. Please try again later.';
          this.isExecutingAction = false;
          this.toastService.showToast({
            id: '',
            read: false,
            subject: 'only_toast',
            title: `${errorMessage}`
          } as AppShellNotification, 8000);
          this.formGroup.enable();
        },
        complete: () => { }
      });

    } else {
      this.formGroup.markAllAsTouched();
    }
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}