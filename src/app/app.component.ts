import { NatsService } from './services/nats.service';
import { AzureService } from './services/azure.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellConfiguration as AppShellConfig } from './appshell.configuration';
import { AppShellPlatformLayoutComponent, AppShellLink, AppShellLinksGroup, AppShellNotification, AppShellPicker, AppShellToastService, AppShellToastsComponent } from '@opendevstack/ngx-appshell';
import { Subject, Subscription } from 'rxjs';
import { CatalogService } from './services/catalog.service';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { CatalogDescriptor, CatalogLink } from './openapi/component-catalog';
import { AppConfigService } from './services/app-config.service';
import { AppUser } from './models/app-user';
import { ProjectService } from './services/project.service';
import { filter, takeUntil } from 'rxjs/operators';
import { AppProject } from './models/project';
import { PlatformSelectorWidgetDialogData } from './models/platform-selector-widget-dialog-data';
import { MatDialog } from '@angular/material/dialog';
import { PlatformSelectorWidgetDialogComponent } from './components/platform-selector-widget-dialog/platform-selector-widget-dialog.component';
import { TopDisclaimerComponent } from './components/top-disclaimer/top-disclaimer.component';


@Component({
    selector: 'app-root',
    imports: [CommonModule, AppShellPlatformLayoutComponent, AppShellToastsComponent, TopDisclaimerComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {

  toastLimitInScreen: number = AppShellConfig.toastLimitInScreen;
  appShellNotificationsLink: AppShellLink | undefined = AppShellConfig.appShellNotificationsLink;
  appShellNotificationsCount: number = 0;
  private readonly natsUrl: string | undefined;
  private unreadMessagesCountSubscription: Subscription | undefined;
  private liveMessageSubscription: Subscription | undefined;
  headerVariant: string = AppShellConfig.headerVariant;
  applicationLogo: string = AppShellConfig.applicationLogo;
  applicationName: string = AppShellConfig.applicationName;
  appShellHelpLink: AppShellLink = AppShellConfig.appShellHelpLink;
  headerLinks: AppShellLink[] = AppShellConfig.headerLinks;
  sidenavSections: AppShellLinksGroup[] = [];
  sidenavLinks: AppShellLinksGroup = {
    label: 'Links',
    links: []
  }
  catalogPicker: AppShellPicker = {
    label: 'Catalog: ',
    options: [],
  }
  projectPicker: AppShellPicker = {
    label: 'Project: ',
    options: [],
    selected: undefined,
    noOptionsMessage: `You don't have access to any projects in the Marketplace.<br/><br/>You can either <a href="${AppShellConfig.createProjectUrl}" target="_blank">create a project</a> or <a href="${AppShellConfig.requestProjectAccessUrl}" target="_blank">request access</a> to an existing project.`,
    noFilteredOptionsMessage: 'No projects match the search term.'
  };
  isPlatformSelectorOpened = false;
  displayTopDisclaimer = !!AppShellConfig.topDisclaimerTextHtml;
  topDisclaimerTextHtml: string = AppShellConfig.topDisclaimerTextHtml;

  loggedUser: AppUser|null = null;

  platformSelectorData = {} as PlatformSelectorWidgetDialogData;

  private _lastNotFoundState = false;
  
  private readonly _destroying$ = new Subject<void>();

  constructor(
    private readonly catalogService: CatalogService, 
    private readonly router: Router, 
    private readonly azureService: AzureService, 
    private readonly toastService: AppShellToastService, 
    private readonly natsService: NatsService,
    private readonly appConfigService :AppConfigService,
    private readonly projectService: ProjectService,
    public dialog: MatDialog
  ) {
    this.natsUrl = this.appConfigService.getConfig()?.natsUrl;
    this.platformSelectorData.serviceUrl = this.appConfigService.getConfig()?.platformSelectorServiceUrl || '';
    this.catalogService.retrieveCatalogDescriptors().subscribe((catalogs) => {
      this.catalogService.setCatalogDescriptors(catalogs);

      this.catalogPicker = { ...this.catalogPicker, options: [] };
      catalogs.forEach((catalog) => {
        if (catalog.slug) {
          this.catalogPicker.options.push(catalog.slug);
        }
      });

      // Always select a catalog for the header picker:
      // - restore the last selected one if present
      // - otherwise default to the first available
      const preferredCatalog = this.catalogService.getSelectedCatalogDescriptor() ?? catalogs[0];
      if (preferredCatalog) {
        this.setCatalogShell(preferredCatalog);
      }
    });
  }

  async ngOnInit(){
    this.azureService.initialize();

    this.catalogService.selectedCatalogSlug$
      .pipe(takeUntil(this._destroying$))
      .subscribe((catalogSlug) => {
        if (!catalogSlug) {
          return;
        }
        const catalog = this.catalogService.getCatalogDescriptors()
          .find(c => this.catalogService.getSlugUrl(c.slug!) === catalogSlug);
        if (!catalog) {
          return;
        }

        // Avoid reloading shell (and links HTTP calls) if we're already on this catalog.
        if (this.catalogPicker.selected === catalog.slug) {
          return;
        }
        this.setCatalogShell(catalog);
      });

    this.projectService.project$
      .pipe(takeUntil(this._destroying$))
      .subscribe((project: AppProject | null) => {
        if (project) {
          this.projectPicker = {...this.projectPicker, selected: project.projectKey};
          this.platformSelectorData = { ...this.platformSelectorData, project: project.projectKey };
        }
      });
    this.listenForProjectInUrl();
    this.azureService.loggedUser$.subscribe((user: AppUser | null) => {
      this.loggedUser = user;
      if (user) {
        const currentProjectForUi = this.projectService.getCurrentProject();
        if(currentProjectForUi) {
          // Apply optimistic UI, start with it and later apply validations after fetching projects to avoid empty parts
          this.projectPicker = {...this.projectPicker, label: 'Project: ', selected: currentProjectForUi.projectKey};
        }
        this.azureService.refreshToken().then((azureData) => {
          this.projectService.getUserProjects(azureData.accessToken).subscribe((projects: string[]) => {
            user.projects = projects;
            this.initializeNats(user);
            if (projects.length > 0) {
              const latestCurrentProject = this.projectService.getCurrentProject();
              if (latestCurrentProject != null && projects.includes(latestCurrentProject.projectKey)) {
                this.pickProject(latestCurrentProject.projectKey);
                this.projectPicker = {...this.projectPicker, label: 'Project: ', selected: latestCurrentProject.projectKey, options: projects};
              } else {
                this.pickProject(projects[0]);
                this.projectPicker = {...this.projectPicker, label: 'Project: ', selected: projects[0], options: projects};
              }
            } else {
              this.pickProject(null);
              this.projectPicker = {...this.projectPicker, label: 'Select project', selected: undefined, options: [] };
            }

          });
        });
      }
    });
  }

  async initializeNats(user: AppUser | null) {
    if(this.natsUrl) {
      if (!this.liveMessageSubscription && !this.unreadMessagesCountSubscription) {
        try {
          await this.natsService.initialize(this.natsUrl);
          this.initializeNatsListeners();
          this.initUserNotifications(user);
        } catch {
          this.appShellNotificationsLink = undefined;
        }
      }
    } else {
      this.appShellNotificationsLink = undefined;
    }
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

  pickProject(project: string | null) {
    this.projectService.setCurrentProject(project);
    this.projectPicker = {...this.projectPicker, selected: project ?? undefined};

    const selectedCatalogSlug = this.catalogPicker.selected;
    if (!selectedCatalogSlug) {
      return;
    }
    const selectedCatalog = this.catalogService.getCatalogDescriptors().find(c => c.slug === selectedCatalogSlug);
    if (!selectedCatalog) {
      return;
    }
    this.setCatalogShell(selectedCatalog);
  }

  setCatalogShell(catalog: CatalogDescriptor) {
    // Always update the header picker + persisted selection (even on non-catalog routes).
    this.catalogPicker = { ...this.catalogPicker, selected: catalog.slug! };
    this.catalogService.setSelectedCatalogSlug(catalog.slug!);

    if (this.isNotFoundRouteActive()) {
      this.clearSidenav();
      return;
    }

    this.sidenavSections = [];
    if (this.projectPicker.selected !== undefined) {
      this.sidenavSections.push({
        label: `PROJECT ${this.projectPicker.selected}`,
        links: [
          {label: 'My Components', anchor: `/${this.projectPicker.selected}/components`, icon: 'box'},
        ]
      });
    }
    this.sidenavSections.push({
      label: catalog.slug!.toUpperCase(),
      links: [
        {label: 'Add Components', anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}`, icon: 'cart'},
        {label: 'Community', anchor: `/${this.catalogService.getSlugUrl(catalog.slug!)}/community`, icon: 'people'}
      ]
    });

    this.sidenavLinks.links = [];
    this.catalogService.getCatalog(catalog.id!).subscribe((catalog) => {
      if (this.isNotFoundRouteActive()) {
        return;
      }
      this.sidenavLinks.links = [];
      catalog.links?.forEach((link: CatalogLink) => {
        this.sidenavLinks.links.push({
          label: link.name,
          anchor: link.url!,
          icon: 'link',
          target: '_blank'
        })
      });
    });
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
    this.liveMessageSubscription?.unsubscribe();
    this.unreadMessagesCountSubscription?.unsubscribe();
  }

  private listenForProjectInUrl(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.extractProjectFromQueryParams();
        this.updateLayoutForRoute();
      });
    this.extractProjectFromQueryParams();
    this.updateLayoutForRoute();
  }

  private updateLayoutForRoute(): void {
    const isNotFoundRoute = this.isNotFoundRouteActive();
    if (isNotFoundRoute) {
      this.clearSidenav();
    } else if (this._lastNotFoundState) {
      this.restoreSidenav();
    }
    this._lastNotFoundState = isNotFoundRoute;
  }

  private restoreSidenav(): void {
    const selectedCatalogSlug = this.catalogPicker.selected;
    if (!selectedCatalogSlug) {
      return;
    }
    const catalog = this.catalogService.getCatalogDescriptors().find(c => c.slug === selectedCatalogSlug);
    if (catalog) {
      this.setCatalogShell(catalog);
    }
  }

  private clearSidenav(): void {
    this.sidenavSections = [];
    this.sidenavLinks = { ...this.sidenavLinks, links: [] };
  }

  private isNotFoundRouteActive(): boolean {
    const routeSnapshot = this.getDeepestRouteSnapshot();
    const routePath = routeSnapshot?.routeConfig?.path;
    return routePath === 'page-not-found' || routePath === '**';
  }

  private getDeepestRouteSnapshot(): ActivatedRouteSnapshot | null {
    const snapshotRoot = this.router.routerState?.snapshot?.root;
    if (!snapshotRoot) {
      return null;
    }

    let route: ActivatedRouteSnapshot | null = snapshotRoot;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  private extractProjectFromQueryParams(): void {
    const url = this.router.url;
    const urlSearchParams = new URLSearchParams(url.split('?')[1] || '');
    const projectParam = urlSearchParams.get('projectKey');

    if (projectParam && typeof projectParam === 'string') {
      this.projectService.setCurrentProject(projectParam);
      this.projectPicker = {...this.projectPicker, selected: projectParam};
    }
  }

  private initUserNotifications(user: AppUser|null) {
    if(user && this.natsUrl) {
      // We convert the username to a valid NATS user name based on their validations:
      // validBucketRe = regexp.MustCompile(^[a-zA-Z0-9_-]+$)
      // validKeyRe = regexp.MustCompile(^[-/_=.a-zA-Z0-9]+$)
      const natsUser = user.username.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_')
      this.natsService.initializeUser(natsUser, user.projects).then(() => {
        setTimeout(() => {
          if(this.appShellNotificationsCount > 0) {
            const notification = {
              id: new Date().getTime().toString() + '-logged',
              title: `You have ${this.appShellNotificationsCount} unread notifications`,
              read: false,
              subject: 'only-toast'
            } as AppShellNotification;
            this.toastService.showToast(notification, 8000);
          }
        }, 1000);
      });
    }
  }

  private initializeNatsListeners() {
    this.unreadMessagesCountSubscription = this.natsService.unreadMessagesCount$.subscribe((count) => {
      this.appShellNotificationsCount = count;
    });
    this.liveMessageSubscription = this.natsService.liveMessage$.subscribe((message) => {
      if (!message?.data) {
        return;
      }
      try {
        if (this.natsService.isValidMessage(message.data)) {
          console.log('Received valid message:', message);
          const notification = {
            id: message.id,
            type: message.data.type,
            title: `You have 1 new notification`,
            date: new Date(message.data.date),
            read: message.read,
            subject: message.subject
          };
          // If you want to show the actual notification, you can show message.data instead of notification
          this.toastService.showToast(notification, 8000);
        } else {
          console.log('Invalid message format:', message);
        }
      } catch {
        console.log('Invalid message format:', message);
      }
    });
  }

  showPlatformSelector() {
    this.isPlatformSelectorOpened = true;
    const dialogRef = this.dialog.open(PlatformSelectorWidgetDialogComponent, {
      panelClass: 'platform-selector-widget-dialog',
      data: this.platformSelectorData,
      backdropClass: 'transparent-backdrop'
    });
    dialogRef.afterClosed().subscribe(() => {
      this.isPlatformSelectorOpened = false;
    });
  }

  closeDisclaimer() {
    this.displayTopDisclaimer = false;
  }
}