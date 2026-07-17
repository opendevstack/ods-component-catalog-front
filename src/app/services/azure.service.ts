import { Inject, Injectable, OnDestroy } from "@angular/core";
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService } from "@azure/msal-angular";
import { EventMessage, EventType, InteractionStatus, RedirectRequest } from "@azure/msal-browser";
import { BehaviorSubject, catchError, filter, from, map, Observable, of, Subject, takeUntil } from "rxjs";
import { Router } from "@angular/router";
import { AppUser } from "../models/app-user";
import { AppConfigService } from "./app-config.service";
import { AzureGroupsService } from "../openapi/projects-info-service";

@Injectable({
    providedIn: 'root'
})
export class AzureService implements OnDestroy {
    isIframe = false;
    loginDisplay = false;
    private readonly _destroying$ = new Subject<void>();
    private cachedAccessToken: string | null = null;
    private tokenExpiresOn: Date | null = null;
    private loginInProgress = false;
    private static readonly TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

    isFirstTime = true;
    loggedUser$ = new BehaviorSubject<AppUser | null >(null);
    
    public userGroups$ = new BehaviorSubject<string[]>([]);
  
    constructor(
      @Inject(MSAL_GUARD_CONFIG) private readonly msalGuardConfig: MsalGuardConfiguration,
      private readonly msalService: MsalService,
      private readonly msalBroadcastService: MsalBroadcastService,
      private readonly router: Router,
      private readonly appConfigService: AppConfigService,
      private readonly azureGroupsService: AzureGroupsService
    ) {}

    initialize() {
        this.isIframe = window !== window.parent && !window.opener; // NOSONAR - Remove this line to use Angular Universal

        this.setLoginDisplay();

        this.msalService.instance.enableAccountStorageEvents(); // Optional - This will enable ACCOUNT_ADDED and ACCOUNT_REMOVED events emitted when a user logs in or out of another tab or window
        this.msalBroadcastService.msalSubject$
        .pipe(
            filter((msg: EventMessage) =>
                msg.eventType === EventType.ACCOUNT_ADDED ||
                msg.eventType === EventType.ACCOUNT_REMOVED
            ),
            takeUntil(this._destroying$)
        )
        .subscribe(() => {
            if (this.msalService.instance.getAllAccounts().length === 0) {
                this.router.navigate(['/']);
            } else {
                this.setLoginDisplay();
            }
        });

        this.msalBroadcastService.inProgress$
        .pipe(
            filter((status: InteractionStatus) => status === InteractionStatus.None),
            takeUntil(this._destroying$)
        )
        .subscribe(() => {
            this.loginInProgress = false;
            this.setLoginDisplay();
            this.checkAndSetActiveAccount();
        });

        this.checkAndSetActiveAccount();
    }

    setLoginDisplay() {
        this.loginDisplay = this.msalService.instance.getAllAccounts().length > 0;
    }

    async getAccessToken(forceRefresh = false): Promise<string> {
        const now = new Date(Date.now() + AzureService.TOKEN_EXPIRY_BUFFER_MS);
        if (!forceRefresh && this.cachedAccessToken && this.tokenExpiresOn && this.tokenExpiresOn > now) {
            return this.cachedAccessToken;
        }
        const scopes = this.appConfigService.getConfig()?.apiConfig?.scopes ?? [];
        let account = this.msalService.instance.getActiveAccount();
        if (!account) {
            const accounts = this.msalService.instance.getAllAccounts();
            if (accounts.length === 0) {
                throw new Error('No accounts found. User must sign in first.');
            }
            account = accounts[0];
            this.msalService.instance.setActiveAccount(account);
        }
        const result = await this.msalService.instance.acquireTokenSilent({ scopes, account });
        this.cachedAccessToken = result.accessToken;
        this.tokenExpiresOn = result.expiresOn;
        return this.cachedAccessToken;
    }

    getRefreshedAccessToken(): Observable<string> {
        return from(this.getAccessToken(true));
    }

    refreshLoggedUser(): void {
        const msalUser = this.msalService.instance.getActiveAccount();
        if (msalUser == null) {
            if(this.isFirstTime && !this.isIframe) {
                this.isFirstTime = false;
                // Add a small delay to prevent rapid loops
                setTimeout(() => {
                    this.login();
                }, 100);
            } else {
                this.loggedUser$.next(null);
            }
        } else {
            const loggedUser = {
                fullName: msalUser.name,
                username: msalUser.username,
                avatarSrc: undefined,
                projects: [],
            } as AppUser;
            
            this.msalService.instance.acquireTokenSilent({
                scopes: ["User.Read"],
                account: msalUser
            })
            .then(async response => {
                try {
                    const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
                        headers: {
                            'Authorization': `Bearer ${response.accessToken}`
                        }
                    });
                    if (!res.ok) {
                        console.warn('Microsoft profile picture not found');
                        return;
                    }
                    const blob = await res.blob();
                    loggedUser.avatarSrc = URL.createObjectURL(blob);
                } catch (error) {
                    console.error('Error fetching profile picture', error);
                }
            })
            .catch(error => {
                console.error('Error acquiring token silently', error);
            })
            .finally(() => {
                this.loggedUser$.next(loggedUser);
                this.loadUserGroups()
                    .subscribe(groups => this.userGroups$.next(groups));
            });
        }
    }

    checkAndSetActiveAccount() {
        /**
         * If no active account set but there are accounts signed in, sets first account to active account
         * To use active account set here, subscribe to inProgress$ first in your component
         * Note: Basic usage demonstrated. Your app may require more complicated account selection logic
         */
        const activeAccount = this.msalService.instance.getActiveAccount();

        if (
            !activeAccount &&
            this.msalService.instance.getAllAccounts().length > 0
        ) {
            const accounts = this.msalService.instance.getAllAccounts();
            this.msalService.instance.setActiveAccount(accounts[0]);
        }
        this.refreshLoggedUser();
    }

    login() {
        if (this.loginInProgress || this.msalService.instance.getAllAccounts().length > 0) {
            return;
        }

        this.loginInProgress = true;

        if (this.msalGuardConfig.authRequest) {
            this.msalService.loginRedirect({
                ...this.msalGuardConfig.authRequest,
            } as RedirectRequest).subscribe({
                error: (error: unknown) => {
                    if (!(error && typeof error === 'object' && 'errorCode' in error && (error as { errorCode?: string }).errorCode === 'interaction_in_progress')) {
                        this.loginInProgress = false;
                        console.error('Error during login redirect', error);
                    }
                }
            });
        } else {
            this.msalService.loginRedirect().subscribe({
                error: (error: unknown) => {
                    if (!(error && typeof error === 'object' && 'errorCode' in error && (error as { errorCode?: string }).errorCode === 'interaction_in_progress')) {
                        this.loginInProgress = false;
                        console.error('Error during login redirect', error);
                    }
                }
            });
        }
    }

    loadUserGroups(): Observable<string[]> {
        return this.azureGroupsService.getAzureGroups().pipe(
            map(groups => Array.isArray(groups) ? groups.filter(Boolean) : []),
            catchError(error => {
                console.error('Error loading Azure groups', error);
                return of([]);
            })
        );
    }

    logout() {
        this.cachedAccessToken = null;
        this.tokenExpiresOn = null;
        this.msalService.logout();
    }

    ngOnDestroy(): void {
        this._destroying$.next(undefined);
        this._destroying$.complete();
    }
}