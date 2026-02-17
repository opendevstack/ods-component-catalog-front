import { Component, OnDestroy, OnInit } from '@angular/core';
import { AppShellProductCatalogScreenComponent, AppShellLink, AppShellFilter } from '@opendevstack/ngx-appshell';
import { CatalogService } from '../../services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AppProduct } from '../../models/app-product';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ProjectService } from '../../services/project.service';
import { CatalogDescriptor } from '../../openapi/component-catalog';

@Component({
    selector: 'app-product-catalog-screen',
    imports: [AppShellProductCatalogScreenComponent],
    templateUrl: './product-catalog-screen.component.html',
    styleUrl: './product-catalog-screen.component.scss'
})
export class ProductCatalogScreenComponent implements OnInit, OnDestroy {
  products: AppProduct[] = [];
  filteredProducts: AppProduct[] = [];
  filters: AppShellFilter[] = [];
  isLoading: boolean = false;

  noProductsIcon?: string = undefined;
  noProductsHtmlMessage?: string = undefined;
  
  breadcrumbLinks: AppShellLink[] = []

  currentCatalog: CatalogDescriptor | undefined;

  private readonly _destroying$ = new Subject<void>();

  constructor(
    private readonly catalogService: CatalogService, 
    private readonly router: Router, 
    private readonly route: ActivatedRoute,
    private readonly projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.projectService.project$
      .pipe(takeUntil(this._destroying$))
      .subscribe(() => {
        if(this.currentCatalog) {
          this.loadProducts(this.currentCatalog);
          this.setupBreadcrumbs(this.currentCatalog);
        }
      });

    this.route.params
      .pipe(takeUntil(this._destroying$))
      .subscribe(params => {
        const catalogSlugParam = params['catalogSlug'];
        const catalogs = this.catalogService.getCatalogDescriptors();

        // Root route: pick a default catalog and redirect to its canonical URL.
        if (!catalogSlugParam) {
          const defaultCatalogSlug = this.catalogService.getSelectedCatalogSlug() ??
            (catalogs[0] ? this.catalogService.getSlugUrl(catalogs[0].slug!) : null);

          if (defaultCatalogSlug) {
            this.catalogService.setSelectedCatalogSlug(defaultCatalogSlug);
            this.router.navigate([`/${defaultCatalogSlug}`]);
          }
          return;
        }

        const catalogSlug = String(catalogSlugParam);

        this.currentCatalog = catalogs.find(catalog => this.catalogService.getSlugUrl(catalog.slug!) === catalogSlug);

        if (!this.currentCatalog) {
          this.router.navigate(['/page-not-found']);
          return;
        }

        this.catalogService.setSelectedCatalogSlug(catalogSlug);
        this.initializeCatalogView(this.currentCatalog);
      });
  }

  private initializeCatalogView(catalog: CatalogDescriptor): void {
    this.setupBreadcrumbs(catalog);
    this.loadProducts(catalog);
    this.loadFilters(catalog);
  }

  private setupBreadcrumbs(catalog: CatalogDescriptor): void {
    const currentProject = this.projectService.getCurrentProject();
    this.breadcrumbLinks = []
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
        anchor: '',
        label: `Catalog ${catalog.slug!}`,
      },
      {
        anchor: '',
        label: 'Add Components',
      }
    );
  }

  private loadProducts(catalog: CatalogDescriptor): void {
    this.products = [];
    this.isLoading = true;
    this.filteredProducts = [];
    this.noProductsIcon = undefined;
    this.noProductsHtmlMessage = undefined;
    const currentProject = this.projectService.getCurrentProject();
    const productListObservable: Observable<AppProduct[]> = currentProject
      ? this.catalogService.getProjectProductsList(currentProject.projectKey, catalog)
      : this.catalogService.getProductsList(catalog);

    productListObservable.subscribe({
      next: (products) => {
        if (!products || products.length === 0) { 
          this.showNoProductsMessage(); 
        }
        this.products = products;
        this.filterProducts(new Map<string, string[]>());
        this.isLoading = false;
      }, 
      error: () => {
        this.showNoProductsMessage();
        this.isLoading = false;
      }
    });
  }

  private loadFilters(catalog: CatalogDescriptor): void {
    this.filters = [];
    this.catalogService.getFilters(catalog.id!).subscribe(filters => {
      this.filters = filters;
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
    this.noProductsIcon = 'smiley_sad';
    this.noProductsHtmlMessage = 'Sorry, we are having trouble loading the results.<br/> Please check back in a few minutes.';
  }

  showNoProductsMatchingFilters() {
    this.noProductsIcon = 'magnifying_glass';
    this.noProductsHtmlMessage = '<b>NO RESULTS.</b><br/>Adjust your filters to see more options.';
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}