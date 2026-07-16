import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellFilter, AppShellIconComponent, AppShellLink, AppShellPageHeaderComponent, AppShellSelectComponent } from '@opendevstack/ngx-appshell';
import { DropdownSelectComponent } from '../../components/input-dropdown-select/input-dropdown-select.component'
import { CatalogActivity, SortOrder, SortParameter } from '../../openapi/component-catalog';
import { delay, of, Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { MatInput, MatLabel, MatFormField } from "@angular/material/input";
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

type CatalogActivityStatusFilter = CatalogActivity.StatusEnum | '';
type DateRangeFilterPossibleValues = '30' | '90' | '180' | '365' | '';

@Component({
    selector: 'app-catalog-activity-screen',
    imports: [CommonModule, AppShellPageHeaderComponent, AppShellIconComponent, DropdownSelectComponent, MatInput, MatLabel, MatFormField, MatButtonModule, FormsModule],
    templateUrl: './catalog-activity-screen.component.html',
    styleUrl: './catalog-activity-screen.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class CatalogActivityScreenComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('loadMoreAnchor', { static: false }) loadMoreAnchor?: ElementRef<HTMLDivElement>;

  private readonly _destroying$ = new Subject<void>();
  private readonly PAGE_SIZE = 20;
  private readonly mockPageCount = 5;
  private readonly mockActivities = this.createMockActivities();
  private intersectionObserver?: IntersectionObserver;

  breadcrumbLinks: AppShellLink[] = [];
  activities: CatalogActivity[] = [];
  isLoading = false;
  isLoadingMore = false;
  hasMore = false;
  connectionErrorHtmlMessage?: string;
  connectionErrorIcon?: string;
  catalogId?: string;

  readonly statusFilterData = {
    label: 'Status',
    options: ['CREATING', 'CREATED', 'FAILED', 'DELETING', 'UNKNOWN'],
    placeholder: 'Select a status'
  } as AppShellFilter;

  readonly skeletonLoadingRows = Array.from({ length: 10 }, (_, index) => index);

  readonly dateRangeFilterData = {
    label: 'Date range',
    options: ['Last 30 days', 'Last 90 days', 'Last 180 days', 'Last 365 days'],
    placeholder: 'Select a date range'
  } as AppShellFilter;

  readonly SortParameter = SortParameter;

  sortParameter: SortParameter = SortParameter.CreationDate;
  sortOrder: SortOrder = SortOrder.Desc;
  projectFilterValue = '';
  statusFilterValues: CatalogActivityStatusFilter[] = [];
  dateRangeFilterValue: DateRangeFilterPossibleValues = '';

  constructor(
      private readonly catalogService: CatalogService,
      private readonly router: Router,
      private readonly route: ActivatedRoute,
      private readonly cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.params
      .pipe(takeUntil(this._destroying$))
      .subscribe(params => {
        const catalogSlug = params['catalogSlug'] || '';
        this.catalogService.setSelectedCatalogSlug(catalogSlug);

        const catalog = this.catalogService.getCatalogDescriptors().find(catalog => this.catalogService.getSlugUrl(catalog.slug!) === catalogSlug);
        if (!catalog) {
          this.router.navigate(['/']);
          return;
        }

        this.catalogId = catalog.id;
        this.breadcrumbLinks = [
          { anchor: '', label: 'Catalogs' },
          { anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}`, label: catalog.slug! },
          { anchor: '', label: 'Catalog Activity' }
        ];

        this.unsetConnectionErrorState();
        this.onResetFilters();
        this.loadActivities(true);
      });
  }

  private extractDateRangeFromSelectedFilter(value: string): string | null {
    const match = value.match(/^Last (\d+) days$/);
    return match ? Number(match[1]).toString() : 'null';
  }

  ngAfterViewInit() {
    this.observeLoadMoreAnchor();
  }

  onSearch(): void {
    this.loadActivities(true);
  }

  onResetFilters(): void {
    this.projectFilterValue = '';
    this.statusFilterValues = [];
    this.dateRangeFilterValue = '';
  }

  updateSort(parameter: SortParameter): void {
    if (this.sortParameter === parameter) {
      this.sortOrder = this.sortOrder === SortOrder.Desc ? SortOrder.Asc : SortOrder.Desc;
    } else {
      this.sortParameter = parameter;
      this.sortOrder = SortOrder.Desc;
    }
    this.loadActivities(true);
  }

  getSortIcon(parameter: SortParameter): string {
    if (this.sortParameter !== parameter) {
      return 'chevron_right';
    }
    return this.sortOrder === SortOrder.Desc ? 'expand_more' : 'expand_less';
  }

  onLoadMore(): void {
    if (!this.hasMore || this.isLoadingMore || this.isLoading) {
      return;
    }
    this.isLoadingMore = true;
    this.loadActivities(false);
  }

  trackByActivity(_: number, activity: CatalogActivity): string | number {
    return activity.componentId ?? activity.catalogItemSlug ?? _;
  }

  private loadActivities(reset: boolean): void {
    if (!this.catalogId) {
      return;
    }

    const page = reset ? 0 : Math.floor(this.activities.length / this.PAGE_SIZE);
    if (reset) {
      this.activities = [];
      this.hasMore = false;
      this.connectionErrorHtmlMessage = undefined;
      this.connectionErrorIcon = undefined;
      this.isLoading = true;
      this.isLoadingMore = false;
    }

    of(this.getMockPage(page, this.PAGE_SIZE))
      .pipe(
        delay(2000),
        takeUntil(this._destroying$)
      )
      .subscribe({
        next: (result) => this.handleActivityResult(result, reset),
        error: () => this.setConnectionErrorState(),
        complete: () => {
          if (reset) {
            this.isLoading = false;
          } else {
            this.isLoadingMore = false;
          }
        }
      });
  }

  private handleActivityResult(result: { data?: CatalogActivity[]; pagination?: { page?: number; totalPages?: number; next?: string | null } }, reset: boolean): void {
    const activities = result.data ?? [];
    this.activities = reset ? activities : [...this.activities, ...activities];
    const pagination = result.pagination;
    if (pagination?.page !== undefined && pagination.totalPages !== undefined) {
      this.hasMore = pagination.page + 1 < pagination.totalPages;
    } else {
      this.hasMore = activities.length >= this.PAGE_SIZE;
    }
    this.cd.detectChanges();
    Promise.resolve().then(() => this.observeLoadMoreAnchor());
  }

  private getMockPage(page: number, size: number): { data: CatalogActivity[]; pagination: { page: number; size: number; totalPages: number; totalElements: number; next: string | null } } {
    const filtered = this.mockActivities
      .filter(activity => !this.projectFilterValue || activity.projectKey?.toLowerCase().includes(this.projectFilterValue.toLowerCase()))
      .filter(activity => !this.statusFilterValues || this.statusFilterValues.length === 0 || this.statusFilterValues.includes(activity.status as CatalogActivityStatusFilter))
      .filter(activity => {
        const rangeStart = this.getDateRangeFilterValueStart(this.extractDateRangeFromSelectedFilter(this.dateRangeFilterValue) as DateRangeFilterPossibleValues);
        return rangeStart === null || (activity.createdAt ?? 0) >= rangeStart;
      });

    const sorted = [...filtered].sort((left, right) => {
      const order = this.sortOrder === SortOrder.Desc ? -1 : 1;
      if (this.sortParameter === SortParameter.Project) {
        return order * ((left.projectKey || '').localeCompare(right.projectKey || ''));
      }
      if (this.sortParameter === SortParameter.Status) {
        return order * ((left.status || '').localeCompare(right.status || ''));
      }
      return order * ((right.createdAt || 0) - (left.createdAt || 0));
    });

    const totalElements = sorted.length;
    const totalPages = Math.min(this.mockPageCount, Math.ceil(totalElements / size));
    const data = sorted.slice(page * size, page * size + size);
    return {
      data,
      pagination: {
        page,
        size,
        totalPages,
        totalElements,
        next: page + 1 < totalPages ? `page=${page + 1}` : null
      }
    };
  }

  private createMockActivities(): CatalogActivity[] {
    const activities: CatalogActivity[] = [];
    const statuses: CatalogActivity.StatusEnum[] = ['CREATING', 'CREATED', 'FAILED', 'DELETING', 'UNKNOWN'];
    const projects = ['PROJECT-A', 'PROJECT-B', 'PROJECT-C'];
    const baseDate = Date.now();

    for (let page = 0; page < this.mockPageCount; page++) {
      for (let index = 0; index < this.PAGE_SIZE; index++) {
        const itemIndex = page * this.PAGE_SIZE + index + 1;
        const createdAt = baseDate - ((page * this.PAGE_SIZE + index) * 60 * 60 * 1000) - (Math.random() < 0.5 ? 2*365 * 24 * 60 * 60 * 1000 : 0);
        activities.push({
          catalogItemSlug: `component-${itemIndex}`,
          componentId: `comp-${itemIndex}`,
          projectKey: projects[itemIndex % projects.length],
          status: statuses[itemIndex % statuses.length],
          createdAt
        });
      }
    }

    return activities;
  }

  private getDateRangeFilterValueStart(range: '30' | '90' | '180' | '365' | ''): number | null {
    if (range === '') {
      return null;
    }
    const days = Number(range);
    if (!days) {
      return null;
    }
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  private setConnectionErrorState(): void {
    this.connectionErrorHtmlMessage = 'Sorry, we are having trouble loading catalog activity right now.<br/>Please try again later.';
    this.connectionErrorIcon = 'smiley_sad';
    this.isLoading = false;
    this.isLoadingMore = false;
  }

  private unsetConnectionErrorState(): void {
    this.connectionErrorHtmlMessage = undefined;
    this.connectionErrorIcon = undefined;
  }

  private observeLoadMoreAnchor(): void {
    if (!this.loadMoreAnchor?.nativeElement || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && this.hasMore && !this.isLoadingMore && !this.isLoading) {
        this.onLoadMore();
      }
    }, { rootMargin: '120px 0px 120px 0px', threshold: 0.1 });

    this.intersectionObserver.observe(this.loadMoreAnchor.nativeElement);
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
    this.intersectionObserver?.disconnect();
  }
}