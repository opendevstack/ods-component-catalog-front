import { AzureService } from './services/azure.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellConfiguration as AppShellConfig } from './appshell.configuration';
import { AppShellLinksGroup, AppShellLink, AppShellUser, AppShellLayoutComponent, AppShellPicker } from '@appshell/ngx-appshell';
import { Subject } from 'rxjs';
import { CatalogService } from './services/catalog.service';
import { Router } from '@angular/router';
import { CatalogDescriptor } from './openapi';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AppShellLayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {

  headerVariant: string = AppShellConfig.headerVariant;
  applicationSymbol: string = AppShellConfig.applicationSymbol;
  applicationName: string = AppShellConfig.applicationName;
  appShellHelpLink: AppShellLink = AppShellConfig.appShellHelpLink;
  headerLinks: AppShellLink[] = AppShellConfig.headerLinks;
  sidenavSections: AppShellLinksGroup[] = [];
  sidenavLinks: AppShellLinksGroup = {
    label: 'Links',
    links: []
  }
  catalogPicker: AppShellPicker = {
    label: 'Catalogs',
    options: [],
  }

  loggedUser: AppShellUser|null = null;
  
  private readonly _destroying$ = new Subject<void>();

  constructor(
    private readonly azureService: AzureService,
    private readonly catalogService: CatalogService,
    private readonly router: Router
  ) {
    this.catalogService.retrieveCatalogDescriptors().subscribe((catalogs) => {
      this.catalogService.setCatalogDescriptors(catalogs);
      catalogs.forEach((catalog) => {
        this.catalogPicker.options.push(catalog.slug!);
      });

      if (this.router.getCurrentNavigation() && this.router.getCurrentNavigation()!.extractedUrl.root.children['primary'].segments.length > 0) {
        const catalogSegment = this.router.getCurrentNavigation()!.extractedUrl.root.children['primary'].segments[0].path;
        const catalog = this.catalogService.getCatalogDescriptors().find(catalog => this.catalogService.getSlugUrl(catalog.slug!) === catalogSegment);
        if(catalog != undefined) {
          this.setCatalogShell(catalog)
        }
      } else {
        this.pickCatalog(catalogs[0].slug!);
      }
    });
  }

  ngOnInit(): void {
		this.azureService.initialize();
		this.azureService.loggedUser$.subscribe((user) => {
			this.loggedUser = user
		});
	}

  login() {
    this.azureService.login();
  }

  logout() {
    this.azureService.logout();
  }

  pickCatalog(catalog: string) {
    const pickedCatalog = this.catalogService.getCatalogDescriptors().find(c => c.slug === catalog);
    if (pickedCatalog) {
      this.setCatalogShell(pickedCatalog);
      this.router.navigate([`/${this.catalogService.getSlugUrl(pickedCatalog.slug!)}`]);
    }
  }

  setCatalogShell(catalog: CatalogDescriptor) {
    this.sidenavSections = [{
      label: catalog.slug!.toUpperCase(),
      links: [
        {label: 'Our offering', anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}`, icon: 'bi-house-icon'},
        {label: 'Community', anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}/community`, icon: 'bi-people-icon'}
      ]
    }];

    this.sidenavLinks.links = [];
    this.catalogService.getCatalog(catalog.id!).subscribe((catalog) => {
      this.sidenavLinks.links = [];
      catalog.links?.forEach((link) => {
        this.sidenavLinks.links.push({
          label: link.name,
          anchor: link.url!,
          icon: 'bi-chain-linked-icon',
          target: '_blank'
        })
      });
    });

    this.catalogPicker.selected = catalog.slug!;
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}