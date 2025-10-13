import { NatsService } from './services/nats.service';
import { AzureService } from './services/azure.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellConfiguration as AppShellConfig } from './appshell.configuration';
import { AppShellLayoutComponent, AppShellLink, AppShellLinksGroup, AppShellNotification, AppShellPicker, AppShellToastService, AppShellToastsComponent } from '@appshell/ngx-appshell';
import { Subject, Subscription } from 'rxjs';
import { CatalogService } from './services/catalog.service';
import { Router } from '@angular/router';
import { CatalogDescriptor } from './openapi';
import { AppConfigService } from './services/app-config.service';
import { AppUser } from './models/app-user';


@Component({
    selector: 'app-root',
    imports: [CommonModule, AppShellLayoutComponent, AppShellToastsComponent],
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

  loggedUser: AppUser|null = null;
  
  private readonly _destroying$ = new Subject<void>();

  constructor(
    private readonly catalogService: CatalogService, 
    private readonly router: Router, 
    private readonly azureService: AzureService, 
    private readonly toastService: AppShellToastService, 
    private readonly natsService: NatsService,
    private readonly appConfigService :AppConfigService
  ) {
    this.natsUrl = this.appConfigService.getConfig()?.natsUrl || undefined;
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
        const storedCatalogSlug = sessionStorage.getItem('catalogSlug');
        const catalogSlug = storedCatalogSlug ?? catalogs[0].slug!;
        const routerUrl = this.router.url?.startsWith('/') ? this.router.url.substring(1) : this.router.url;
        if (!this.router.config?.some(route => route.path === routerUrl)) {
          this.pickCatalog(catalogSlug);
        } else {
          const catalog = catalogs.find(catalog => catalog.slug === catalogSlug);
          if (catalog) {
            this.setCatalogShell(catalog);
          }
        }
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.azureService.initialize();
    this.azureService.loggedUser$.subscribe((user: AppUser | null) => {
      this.loggedUser = user;
      if (user) {
        this.initializeNats(user);
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
    sessionStorage.setItem('catalogSlug', catalog.slug!);
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
    this.liveMessageSubscription?.unsubscribe();
    this.unreadMessagesCountSubscription?.unsubscribe();
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
}