import { Component } from '@angular/core';
import { AppShellProductViewScreenComponent, AppShellProduct, AppShellLink } from '@appshell/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoRepositoryAccessDialogComponent } from '../../components/no-repository-access-dialog/no-repository-access-dialog.component';

@Component({
  selector: 'app-product-view-screen',
  standalone: true,
  imports: [AppShellProductViewScreenComponent, MatDialogModule],
  templateUrl: './product-view-screen.component.html',
  styleUrl: './product-view-screen.component.scss'
})
export class ProductViewScreenComponent {

  product: AppShellProduct = {} as AppShellProduct;
  actionButtonText: string | undefined;
  breadcrumbLinks: AppShellLink[] = []

  constructor(
    private readonly catalogService: CatalogService,
    private readonly router: Router, 
    private readonly route: ActivatedRoute,
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
          if(product.link) {
            this.actionButtonText = 'View Code';
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
    if(this.product.link && this.product.link !== CatalogService.NO_PERMISSION_CODE_LINK) {
      window.open(this.product.link, '_blank');
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
  };

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