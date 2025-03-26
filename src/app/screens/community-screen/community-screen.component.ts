import { ChangeDetectorRef, Component, ViewEncapsulation } from '@angular/core';
import { FileFormat, FilesService } from '../../openapi';
import { MarkdownComponent } from 'ngx-markdown';
import { AppShellLink, AppshellPageHeaderComponent } from '@appshell/ngx-appshell';
import { catchError, map, Observable, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-community-screen',
  standalone: true,
  imports: [MarkdownComponent, AppshellPageHeaderComponent, AsyncPipe],
  templateUrl: './community-screen.component.html',
  styleUrl: './community-screen.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CommunityScreenComponent {

  pageContent: Observable<string>;
  breadcrumbLinks: AppShellLink[];
  
  noProductsHtmlMessage: string | undefined;
  noProductsIcon: string | undefined;

  private readonly communityFileId = 'L3Byb2plY3RzL0RTTUMvcmVwb3MvY2F0YWxvZy9yYXcvY29tbXVuaXR5Lm1kP2F0PXJlZnMvaGVhZHMvbWFzdGVyCg==';

  constructor(private readonly filesService: FilesService, private readonly cd: ChangeDetectorRef) {
    this.breadcrumbLinks = [
      { label: 'CATALOG', anchor: '' },
      { label: 'Community', anchor: '' },
    ];
    this.pageContent = this.filesService.getFileById(this.communityFileId, FileFormat.Markdown, 'body', false, {httpHeaderAccept: 'text/*'})
      .pipe(
        map((file: any) => file),
        catchError((error: any) => {
          if (error.status !== 422) {
            this.noProductsHtmlMessage = 'Sorry, we are having trouble loading the page.<br/>Please check back in a few minutes.';
            this.noProductsIcon = 'bi-smiley-sad-icon';
          }
          return of('');
        })
      );
  }

  ngAfterViewInit() {
    this.cd.detectChanges();
  }

}
