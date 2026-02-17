import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FileFormat, FilesService } from '../../openapi/component-catalog';
import { MarkdownComponent } from 'ngx-markdown';
import { AppShellIconComponent, AppShellLink, AppShellPageHeaderComponent } from '@opendevstack/ngx-appshell';
import { Subject, catchError, map, of, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';

@Component({
    selector: 'app-community-screen',
    imports: [MarkdownComponent, AppShellPageHeaderComponent, AppShellIconComponent],
    templateUrl: './community-screen.component.html',
    styleUrl: './community-screen.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class CommunityScreenComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly _destroying$ = new Subject<void>();


  pageContent?: string;
  breadcrumbLinks: AppShellLink[] = [];
  
  connectionErrorHtmlMessage: string | undefined;
  connectionErrorIcon: string | undefined;

  constructor(
      private readonly catalogService: CatalogService, 
      private readonly router: Router, 
      private readonly route: ActivatedRoute,
      private readonly filesService: FilesService, 
      private readonly cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.params
      .pipe(takeUntil(this._destroying$))
      .subscribe(params => {
      const catalogSlug = params['catalogSlug'] || '';

      this.catalogService.setSelectedCatalogSlug(catalogSlug);

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
          anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}`,
          label: catalog.slug!,
        },
        {
          anchor: '',
          label: 'Community',
        }
      ]

      this.catalogService.getCatalog(catalog.id!).subscribe({
        next: (catalog) => {
          if (catalog?.communityPageId) {
            this.filesService.getFileById(catalog.communityPageId, FileFormat.Markdown, 'body', false, {httpHeaderAccept: 'text/*'})
              .pipe(
                map((file: string) => file),
                catchError((error: { status?: number }) => {
                  if (error.status !== 422) {
                    this.setConnectionErrorState();
                  }
                  return of('');
                })
              )
              .subscribe((file: string) => {
                this.pageContent = file;
                if (file !== '') {
                  this.unsetConnectionErrorState();
                }
              });
          }
        },
        error: () => {
          this.setConnectionErrorState();
        }
      });
    });
  }

  ngAfterViewInit() {
    this.cd.detectChanges();
  }

  private setConnectionErrorState() {
    this.connectionErrorHtmlMessage = 'Sorry, we are having trouble loading the page.<br/>Please check back in a few minutes.';
    this.connectionErrorIcon = 'smiley_sad';
  }
  
  private unsetConnectionErrorState() {
    this.connectionErrorHtmlMessage = undefined;
    this.connectionErrorIcon = undefined;
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }

}