import { Component, OnInit } from '@angular/core';
import { AppShellProductViewScreenComponent, AppShellLink, AppShellPicker } from '@appshell/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoRepositoryAccessDialogComponent } from '../../components/no-repository-access-dialog/no-repository-access-dialog.component';
import { HttpClient } from '@angular/common/http';
import { AppProduct } from '../../models/app-product';
import { ProductAction } from '../../models/product-action';

@Component({
    selector: 'app-product-view-screen',
    imports: [AppShellProductViewScreenComponent, MatDialogModule],
    templateUrl: './product-view-screen.component.html',
    styleUrl: './product-view-screen.component.scss'
})
export class ProductViewScreenComponent implements OnInit {

  product: AppProduct = {} as AppProduct;
  actionButtonText: string | undefined;
  secondaryActionButtonText: string | undefined;
  actionPicker: AppShellPicker | undefined;
  breadcrumbLinks: AppShellLink[] = []

  constructor(
    private readonly catalogService: CatalogService,
    private readonly router: Router, 
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'] || '';
      const catalogSlug = params['catalogSlug'] || '';

      const catalog = this.catalogService.getCatalogDescriptors().find(catalog => this.catalogService.getSlugUrl(catalog.slug!) === catalogSlug);
      
      if(id === '' || !catalog) {
        this.router.navigate(['/']);
        return;
      }
      
      this.catalogService.getProduct(id).subscribe({
        next: (product) => {
          this.product = product;

          this.actionButtonText = undefined;
          this.secondaryActionButtonText = undefined;
          this.actionPicker = undefined;

          if(product.actions && product.actions.length > 0) {
            this.actionButtonText = product.actions[0].label;

            if(product.actions.length === 2) {
              this.secondaryActionButtonText = product.actions[1].label;
            } else if (product.actions.length > 2) {
              this.actionPicker = {
                label: 'More actions',
                options: [...product.actions.slice(1).map(action => action.label)]
              };
            }
          }
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
              anchor: '',
              label: this.product.title,
            }
          ]
        }, 
        error: () => {
          console.log('Error loading product');
          this.router.navigate(['/']);
        }
      });
    });
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
    if (this.product.actions && this.product.actions.length === 2) {
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
      .replace(/-/g, '+')
      .replace(/_/g, '/');

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
}