import { Component } from '@angular/core';
import { AppshellProductViewScreenComponent, AppShellProduct, AppShellLink } from '@appshell/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoRepositoryAccessDialogComponent } from '../../components/no-repository-access-dialog/no-repository-access-dialog.component';

@Component({
  selector: 'app-product-view-screen',
  standalone: true,
  imports: [AppshellProductViewScreenComponent, MatDialogModule],
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

      if(id === '') {
        this.router.navigate(['/']);
      }
      
      this.catalogService.getProduct(id).subscribe({
        next: (product) => {
          this.product = product;
          this.actionButtonText = 'View Code';
          this.breadcrumbLinks = [
            {
              anchor: '',
              label: 'CATALOG',
            },
            {
              anchor: '/',
              label: 'Our repositories',
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
    if(this.product.link) {
      window.open(this.product.link, '_blank');
    } else {
      const buttonElement = document.activeElement as HTMLElement; 
      buttonElement.blur();
      this.dialog.open(NoRepositoryAccessDialogComponent, {
        width: '480px',
        autoFocus: false
      });
    }
  };
}
