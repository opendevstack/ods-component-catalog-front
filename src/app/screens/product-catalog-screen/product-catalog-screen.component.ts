import { Component } from '@angular/core';
import { AppShellProductCatalogScreenComponent, AppShellProduct, AppShellLink, AppShellFilter } from '@appshell/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-product-catalog-screen',
  standalone: true,
  imports: [AppShellProductCatalogScreenComponent],
  templateUrl: './product-catalog-screen.component.html',
  styleUrl: './product-catalog-screen.component.scss'
})
export class ProductCatalogScreenComponent {
  products: AppShellProduct[] = [];
  filteredProducts: AppShellProduct[] = [];
  filters: AppShellFilter[] = [];

  noProductsIcon?: string = undefined;
  noProductsHtmlMessage?: string = undefined;
  
  breadcrumbLinks: AppShellLink[] = []

  constructor(
    private readonly catalogService: CatalogService, 
    private readonly router: Router, 
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const catalogSlug = params['catalogSlug'] || '';

      const catalog = this.catalogService.getCatalogDescriptors().find(catalog => this.catalogService.getSlugUrl(catalog.slug!) === catalogSlug);

      if(!catalog) {
        this.router.navigate(['/']);
        return;
      }

      this.breadcrumbLinks = [
        {
          anchor: '',
          label: 'Catalogs',
        },
        {
          anchor: '',
          label: catalog.slug!,
        }
      ]

      this.products = [];
      this.filteredProducts = [];
      this.filters = [];
      this.noProductsIcon = undefined;
      this.noProductsHtmlMessage = undefined;

      this.catalogService.getProductsList(catalog).subscribe({
        next: (products) => {
          if (!products || products.length === 0) { this.showNoProductsMessage(); }
          this.products = products;
          this.filterProducts(new Map<string, string[]>());
        }, 
        error: () => {
          this.showNoProductsMessage();
        }
      });
      this.catalogService.getFilters(catalog.id!).subscribe(filters => {
        this.filters = filters;
      });
      this.filterProducts(new Map<string, string[]>());
    });
  }

  filterProducts(activeFilters: Map<string, string[]>): void {
    const filters = Array.from(activeFilters.values()).flat();
    if(filters.length === 0) { 
      this.filteredProducts = [...this.products]
    } else {
      this.filteredProducts = this.products.filter(product => {
        if(!product.tags) {
          return false;
        }
        for (const [key, values] of activeFilters) {
          const tag = product.tags.find(tag => tag.label === key);
          if (!tag || !values.every(value => tag.options.includes(value))) {
            return false;
          }
        }
        return true
      });
    }
    if (this.products && this.products.length > 0 && (!this.filteredProducts || this.filteredProducts.length === 0)) {
      this.showNoProductsMatchingFilters();
    }
  }

  showNoProductsMessage() {
    this.noProductsIcon = 'bi-smiley-sad-icon';
    this.noProductsHtmlMessage = 'Sorry, we are having trouble loading the results.<br/> Please check back in a few minutes.';
  }

  showNoProductsMatchingFilters() {
    this.noProductsIcon = 'bi-magnifying-glass-icon';
    this.noProductsHtmlMessage = '<b>NO RESULTS.</b><br/>Adjust your filters to see more options.';
  }
}