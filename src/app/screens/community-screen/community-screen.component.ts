import { ChangeDetectorRef, Component, ViewEncapsulation } from '@angular/core';
import { FileFormat, FilesService } from '../../openapi';
import { MarkdownComponent } from 'ngx-markdown';
import { AppShellLink, AppShellPageHeaderComponent } from '@appshell/ngx-appshell';
import { catchError, map, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-community-screen',
  standalone: true,
  imports: [MarkdownComponent, AppShellPageHeaderComponent],
  templateUrl: './community-screen.component.html',
  styleUrl: './community-screen.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CommunityScreenComponent {

  pageContent?: string;
  breadcrumbLinks: AppShellLink[] = [];
  
  noProductsHtmlMessage: string | undefined;
  noProductsIcon: string | undefined;

  constructor(
      private readonly catalogService: CatalogService, 
      private readonly router: Router, 
      private readonly route: ActivatedRoute,
      private readonly filesService: FilesService, 
      private readonly cd: ChangeDetectorRef) {}

  ngOnInit() {
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
          anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}`,
          label: catalog.slug!,
        },
        {
          anchor: '',
          label: 'Community',
        }
      ]

      this.catalogService.getCatalog(catalog.id!).subscribe(catalog => {
        if (catalog?.communityPageId) {
          this.filesService.getFileById(catalog.communityPageId, FileFormat.Markdown, 'body', false, {httpHeaderAccept: 'text/*'})
            .pipe(
              map((file: string) => file),
              catchError((error: any) => {
              if (error.status !== 422) {
                this.noProductsHtmlMessage = 'Sorry, we are having trouble loading the page.<br/>Please check back in a few minutes.';
                this.noProductsIcon = 'bi-smiley-sad-icon';
              }
              return of('');
              })
            )
            .subscribe((file: string) => {
              this.pageContent = file;
            });
        }
      });
    });
  }

  ngAfterViewInit() {
    this.cd.detectChanges();
  }

}