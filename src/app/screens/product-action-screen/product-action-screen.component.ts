import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AppShellLink, AppShellPageHeaderComponent, AppShellToastService, AppShellNotification } from '@appshell/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CatalogDescriptor } from '../../openapi';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductAction } from '../../models/product-action';
import { ProductActionParameter } from '../../models/product-action-parameter';
import { AppProduct } from '../../models/app-product';
import { ProductActionParameterValidation } from '../../models/product-action-parameter-validation';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-product-action-screen',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, AppShellPageHeaderComponent, MatButtonModule, MatProgressSpinnerModule, MatSelectModule, MatOptionModule],
  templateUrl: './product-action-screen.component.html',
  styleUrl: './product-action-screen.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProductActionScreenComponent implements OnInit {

  breadcrumbLinks: AppShellLink[] = []
  pageTitle = '';
  product: AppProduct = {} as AppProduct;
  productCatalog?: CatalogDescriptor;

  action: ProductAction = {} as ProductAction;
  actionParams: ProductActionParameter[] = [];

  formGroup: FormGroup;

  isExecutingAction = false;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastService: AppShellToastService,
    public dialog: MatDialog,
    private readonly fb: FormBuilder,
    private readonly http: HttpClient
  ) {
    this.formGroup = this.fb.group({});
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const catalogSlug = params['catalogSlug'] || '';
      const id = params['id'] || '';
      const action = params['action'] || '';

      const catalog = this.catalogService.getCatalogDescriptors().find(catalog => this.catalogService.getSlugUrl(catalog.slug!) === catalogSlug);

      if (id === '' || !catalog) {
        this.router.navigate(['/']);
        return;
      }

      this.productCatalog = catalog;

      this.catalogService.getProduct(id).subscribe({
        next: (product) => {
          this.product = product;

          const productAction = product.actions?.find(a => a.id.toLowerCase() === action.toLowerCase());
          if (action === '' || !productAction) {
            this.router.navigate([`/${this.catalogService.getSlugUrl(catalog.slug!)}/item/${id}`]);
            return;
          }

          this.action = productAction;

          this.pageTitle = `${productAction.label} ${product.title}`

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
              anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}/item/${id}`,
              label: this.product.title,
            }
          ]

          this.formGroup = this.fb.group({});
          if (productAction.parameters && productAction.parameters.length > 0) {
            for (const param of productAction.parameters) {
              const validators: ValidatorFn[] = [];

              if (param.required) {
                validators.push(Validators.required);
              }

              const paramWithValidations = param;
              if (paramWithValidations.validations && paramWithValidations.validations.length > 0) {
                validators.push(this.createCustomValidator(paramWithValidations.validations));
              }

              this.formGroup.addControl(
                param.name,
                this.fb.control(this.getParamDefaultValue(param), validators.length > 0 ? validators : null)
              );
            }
          }
          this.actionParams = productAction.parameters || [];
        },
        error: () => {
          console.log('Error loading product');
          this.router.navigate(['/']);
        }
      });
    });
  }

  private getParamDefaultValue(param: ProductActionParameter): string | string[] | null | undefined {
    let defaultValue: string | string[] | null | undefined;
    if (param.type === 'multiplelist') {
      defaultValue = param.defaultValues?.filter(v => param.options?.includes(v)) || [];
    } else if (param.type === 'singlelist') {
      let defaultOption;
      if (param.locations && param.locations.length > 0) {
        // ToDo: In the future this will need to include some logic based on the project (waiting for EDPC-3709)
        defaultOption = param.locations[0].value;
      } else {
        defaultOption = param.defaultValue;
      }
      if (defaultOption != null && param.options?.includes(defaultOption)) {
        defaultValue = defaultOption;
      } else {
        defaultValue = null;
      }
    } else if (param.locations && param.locations.length > 0) {
      // ToDo: In the future this will need to include some logic based on the project (waiting for EDPC-3709)
      defaultValue = param.locations[0].value;
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
            let errorMessage = validation.errorMessage != '' && validation.errorMessage != null ? validation.errorMessage : `Invalid value not matching ${validation.regex}`;
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
    if (this.formGroup.valid && this.action.url) {
      this.isExecutingAction = true;
      const actionBody = {
        id: this.action.id,
        parameters: this.action.parameters?.map(param => ({
          name: param.name,
          type: param.type,
          value: this.formGroup.value[param.name] || this.getParamDefaultValue(param) || ''
        })) || [],
      };
      actionBody.parameters.push({
        name: 'catalog_item_id',
        type: 'string',
        value: this.product.id
      });
      this.formGroup.disable();
      this.http.post(this.action.url, actionBody).subscribe({
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

          if (this.productCatalog?.slug) {
            this.router.navigate([`/${this.catalogService.getSlugUrl(this.productCatalog?.slug)}`]);
          } else {
            console.log('Cannot retrieve catalog slug for navigation');
            this.router.navigate(['/']);
          }
        },
        error: (error) => {
          console.error('Error executing action:', error);
          this.isExecutingAction = false;
          this.toastService.showToast({
            id: '',
            read: false,
            subject: 'only_toast',
            title: `Something went wrong. Please try again later.`
          } as AppShellNotification, 8000);
          this.formGroup.enable();
        },
        complete: () => { }
      });

    } else {
      this.formGroup.markAllAsTouched();
    }
  }
}