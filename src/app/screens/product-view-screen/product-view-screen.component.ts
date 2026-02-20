import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AppShellProductViewScreenComponent, AppShellLink, AppShellPicker, AppShellButton } from '@opendevstack/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoRepositoryAccessDialogComponent } from '../../components/no-repository-access-dialog/no-repository-access-dialog.component';
import { AppProduct } from '../../models/app-product';
import { ProductAction } from '../../models/product-action';
import { ProjectService } from '../../services/project.service';
import { Subject, takeUntil } from 'rxjs';
import { CatalogDescriptor } from '../../openapi/component-catalog';

@Component({
    selector: 'app-product-view-screen',
    imports: [AppShellProductViewScreenComponent, MatDialogModule],
    templateUrl: './product-view-screen.component.html',
    styleUrl: './product-view-screen.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class ProductViewScreenComponent implements OnInit, OnDestroy {

  product: AppProduct = {} as AppProduct;
  actionButton: AppShellButton | undefined;
  secondaryActionButton: AppShellButton | undefined;
  actionPicker: AppShellPicker | undefined;
  pageTitle = '';
  breadcrumbLinks: AppShellLink[] = []

  currentCatalogItemId: string | undefined;
  currentCatalog: CatalogDescriptor | undefined;

  private readonly _destroying$ = new Subject<void>();

  constructor(
    private readonly catalogService: CatalogService,
    private readonly router: Router, 
    private readonly route: ActivatedRoute,
    private readonly projectService: ProjectService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.projectService.project$
      .pipe(takeUntil(this._destroying$))
      .subscribe(() => {
        if(this.currentCatalog && this.currentCatalogItemId) {
          this.loadProduct(this.currentCatalogItemId, this.currentCatalog);
        }
      });

    this.route.params
      .pipe(takeUntil(this._destroying$))
      .subscribe((params: Params) => {
      this.currentCatalogItemId = params['id'] || '';
      const catalogSlug = params['catalogSlug'] || '';

      this.catalogService.setSelectedCatalogSlug(catalogSlug);

      this.currentCatalog = this.catalogService.getCatalogDescriptors().find(catalog => this.catalogService.getSlugUrl(catalog.slug!) === catalogSlug);
      
      if(this.currentCatalogItemId === '' || !this.currentCatalog) {
        this.router.navigate(['/']);
        return;
      }

      this.loadProduct(this.currentCatalogItemId!, this.currentCatalog);
    });
  }

  private loadProduct(id: string, catalog: CatalogDescriptor) {
    const currentProject = this.projectService.getCurrentProject();
    const productObservable = currentProject
      ? this.catalogService.getProjectProduct(currentProject.projectKey, id)
      : this.catalogService.getProduct(id);
    
    productObservable.subscribe({
      next: (product) => this.handleProductLoaded(product, catalog),
      error: () => this.handleProductLoadError()
    });
  }

  private handleProductLoaded(product: AppProduct, catalog: CatalogDescriptor) {
    this.product = product;
    this.pageTitle = product.title;
    this.setupActionButtons();
    this.setupBreadcrumbs(catalog);
  }

  private setupActionButtons() {
    this.actionButton = undefined;
    this.secondaryActionButton = undefined;
    this.actionPicker = undefined;

    if (!this.product.actions || this.product.actions.length === 0) {
      return;
    }

    this.actionButton = this.createActionButton(this.product.actions[0]);

    if (this.product.actions.length === 2) {
      this.secondaryActionButton = this.createActionButton(this.product.actions[1]);
    } else if (this.product.actions.length > 2) {
      this.actionPicker = {
        label: 'More actions',
        options: this.product.actions.slice(1).map(action => action.label)
      };
    }
  }

  private createActionButton(action: ProductAction): AppShellButton {
    return {
      label: action.label,
      disabled: !action.requestable,
      tooltip: action.requestable ? '' : action.restrictionMessage
    };
  }

  private setupBreadcrumbs(catalog: CatalogDescriptor): void {
    this.breadcrumbLinks = [];

    const currentProject = this.projectService.getCurrentProject();
    if (currentProject) {
      this.breadcrumbLinks.push(
        {
          anchor: '',
          label: `Project ${currentProject.projectKey}`,
        }
      );
    }
    this.breadcrumbLinks.push(
      {
        anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}`,
        label: `Catalog ${catalog.slug!}`,
      },
      {
        anchor: '',
        label: 'Add Components',
      },
      {
        anchor: '',
        label: this.product.title,
      }
    );
  }

  private handleProductLoadError() {
    console.log('Error loading product');
    this.router.navigate(['/']);
  }

  actionButtonFn() {
    if (this.product.actions && this.product.actions.length > 0) {
      if (this.product.actions[0].id === CatalogService.CODE_PRODUCT_TYPE) {
        this.viewCodeAction(this.product.actions[0]);
      } else {
        this.genericAction(this.product.actions[0]);
      }
    }
  }

  secondaryActionButtonFn() {
    if (this.product.actions?.length === 2) {
      if (this.product.actions[1].id === CatalogService.CODE_PRODUCT_TYPE) {
        this.viewCodeAction(this.product.actions[1]);
      } else {
        this.genericAction(this.product.actions[1]);
      }
    }
  }

  actionPickerFn(picked: string) {
    const action = this.product.actions?.find(a => a.label === picked);
    if (!action) {
      return;
    }
    if (action.id === CatalogService.CODE_PRODUCT_TYPE) {
      this.viewCodeAction(action);
    } else {
      this.genericAction(action);
    }
  }

  genericAction(action: ProductAction) {
    this.router.navigate([action.id.toLowerCase()], { relativeTo: this.route });
  }

  viewCodeAction(action: ProductAction) {
    if(action.url) {
      window.open(action.url, '_blank');
    } else {
      const buttonElement = document.activeElement as HTMLElement; 
      buttonElement.blur();

      // The productId is in the format of /projects/XXXX/repos/YYYY/raw/Catalog.yaml?at=refs/heads/.... encoded using base64url (not standard base64)
      const productId = this.base64URLDecode(this.product.id);
      const productIdParts = productId.split('/').filter(Boolean); // Filter out empty segments

      if (productIdParts.length > 2) {
        const projectKey = productIdParts[1];

        this.dialog.open(NoRepositoryAccessDialogComponent, {
          width: '480px',
          autoFocus: false,
          data: { project: projectKey }
        });
      }
    }
  }

  base64URLDecode(originalStr: string): string {
    let str = originalStr
      .replaceAll('-', '+')
      .replaceAll('_', '/');

    const pad = str.length % 4;
    if(pad) {
      if(pad === 1) {
        console.error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
        return originalStr;
      }
      str += new Array(5-pad).join('=');
    }

    return atob(str);
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}