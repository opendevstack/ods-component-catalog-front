import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AzureService } from './azure.service';
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService } from "@azure/msal-angular";
import { BehaviorSubject, of, Subject } from 'rxjs';
import { AuthenticationResult, EventMessage, EventType, InteractionStatus, InteractionType, RedirectRequest } from '@azure/msal-browser';
import { Router } from '@angular/router';
import { AppConfigService } from './app-config.service';

const destroyingMethodName = '_destroying$';
const fakeToken = 'test-token';

describe('AzureService', () => {
    let service: AzureService;
    let msalService: jasmine.SpyObj<MsalService>;
    const msalGuardConfig: jasmine.SpyObj<MsalGuardConfiguration> = jasmine.createSpyObj('MsalGuardConfiguration', ['authRequest', 'interactionType']);
    let msalSubject$: Subject<EventMessage>;
    let inProgress$: Subject<InteractionStatus>;
    const msalInstanceSpy = jasmine.createSpyObj('instance', ['enableAccountStorageEvents', 'getAllAccounts', 'getActiveAccount', 'setActiveAccount', 'acquireTokenSilent']);
    const mockRouter: jasmine.SpyObj<Router> =  jasmine.createSpyObj('Router', ['navigate']);;
    const appConfigServiceSpy = jasmine.createSpyObj('AppConfigService', ['getConfig']);

    beforeEach(() => {
        msalSubject$ = new Subject<EventMessage>();
        inProgress$ = new Subject<InteractionStatus>();
        
        const msalServiceSpy = jasmine.createSpyObj('MsalService', ['handleRedirectObservable', 'instance', 'loginRedirect', 'logout']);
        const msalBroadcastServiceSpy = jasmine.createSpyObj('MsalBroadcastService', [], {
            msalSubject$: msalSubject$.asObservable(),
            inProgress$: inProgress$.asObservable()
        });
        appConfigServiceSpy.getConfig.and.returnValue({ apiConfig: { scopes: ['User.Read'] } });
        
        TestBed.configureTestingModule({
            providers: [
                AzureService,
                { provide: MSAL_GUARD_CONFIG, useValue: msalGuardConfig },
                { provide: MsalService, useValue: msalServiceSpy },
                { provide: MsalBroadcastService, useValue: msalBroadcastServiceSpy },
                { provide: Router, useValue: mockRouter },
                { provide: AppConfigService, useValue: appConfigServiceSpy }
            ]
        });

        service = TestBed.inject(AzureService);
        msalService = TestBed.inject(MsalService) as jasmine.SpyObj<MsalService>;
        msalInstanceSpy.getAllAccounts.and.returnValue([{}]);
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        msalInstanceSpy.acquireTokenSilent.calls.reset();
        msalService.instance = msalInstanceSpy;
        // Clear the token cache so each test starts fresh
        (service as any).cachedAccessToken = null;
        (service as any).tokenExpiresOn = null;
        msalGuardConfig.interactionType = InteractionType.Redirect;
        
        window.onbeforeunload = () => "Oh no!"; // Prevent page reloads during tests 
    });

    afterEach(() => {
        service.ngOnDestroy();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize properties in the constructor', () => {
        expect(service.isIframe).toBeFalse();
        expect(service.loginDisplay).toBeFalse();
        expect(service.isFirstTime).toBeTrue();
        expect(service.loggedUser$).toBeInstanceOf(BehaviorSubject);
        expect(service.loggedUser$.value).toBeNull();
    });

    it('initialize method works', () => {
        service.initialize();
        msalSubject$.next({eventType: EventType.ACCOUNT_ADDED} as EventMessage);
        inProgress$.next(InteractionStatus.None);
        expect(msalService.instance.enableAccountStorageEvents).toHaveBeenCalled();
    });

    it('initialize - should set window.location.pathname to "/" when all accounts are removed', fakeAsync(() => {
        msalInstanceSpy.getAllAccounts.and.returnValue([]);
        service.initialize();
        msalSubject$.next({ eventType: EventType.ACCOUNT_REMOVED } as EventMessage);
        tick();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    }));

    it('refreshLoggedUser - should set loggedUser$ to null if no msalUser and isFirstTime is true', fakeAsync(() => {
        service.isFirstTime = true;
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        service.refreshLoggedUser();
        expect(service.isFirstTime).toBe(false);
        tick();
        expect(service.loggedUser$.value).toBeNull();
    }));

    it('refreshLoggedUser - should set loggedUser$ to null if no msalUser and isFirstTime is false', fakeAsync(() => {
        service.isFirstTime = false;
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        service.refreshLoggedUser();
        tick();
        expect(service.loggedUser$.value).toBeNull();
    }));

    it('refreshLoggedUser - should set loggedUser$ with user details if msalUser exists', (done) => {
        const msalUser = { name: 'Test User' };
        msalInstanceSpy.getActiveAccount.and.returnValue(msalUser);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: fakeToken }));

        spyOn(window, 'fetch').and.returnValues(
            Promise.resolve(new Response(new Blob())),
            Promise.resolve(new Response('{"value": [{"displayName": "BI-AS-ATLASSIAN-P-PROJECT1-MANAGER"}, {"displayName": "BI-AS-ATLASSIAN-P-PROJECT2-TEAM"}, {"displayName": "BI-AS-ATLASSIAN-P-PROJECT3-STAKEHOLDER"}, {"displayName": "BI-AS-ATLASSIAN-P-PROJECT3-INVALID_ROLE"}]}'))
        );

        service.loggedUser$.subscribe((user) => {
            if (user) {
                expect(user.fullName).toBe(msalUser.name);
                expect(user.avatarSrc).not.toBeUndefined();
                done();
            }
        });

        service.refreshLoggedUser();
    });

    it('refreshLoggedUser - should handle error when acquiring token silently', (done) => {
        const msalUser = { name: 'Test User' };
        msalInstanceSpy.getActiveAccount.and.returnValue(msalUser);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('Error acquiring token silently')));

        service.refreshLoggedUser();

        setTimeout(() => {
            expect(service.loggedUser$.value!.fullName).toBe(msalUser.name);
            done();
        }, 0);
    });

    it('refreshLoggedUser - should handle error when fetching profile picture', (done) => {
        const msalUser = { name: 'Test User' };
        msalInstanceSpy.getActiveAccount.and.returnValue(msalUser);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: fakeToken }));

        spyOn(window, 'fetch').and.callFake(() => Promise.reject(new Error('Error fetching profile picture')));

        service.refreshLoggedUser();

        setTimeout(() => {
            expect(service.loggedUser$.value!.fullName).toBe(msalUser.name);
            done();
        }, 0);
    });

    it('refreshLoggedUser - should handle 404 error when fetching profile picture', (done) => {
        const msalUser = { name: 'Test User' };
        msalInstanceSpy.getActiveAccount.and.returnValue(msalUser);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: fakeToken }));
    
        spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(null, { status: 404 })));
    
        service.refreshLoggedUser();
    
        setTimeout(() => {
            expect(service.loggedUser$.value!.fullName).toBe(msalUser.name);
            expect(service.loggedUser$.value!.avatarSrc).toBeUndefined();
            done();
        }, 0);
    });

    it('login - should call loginRedirect with authRequest if msalGuardConfig.authRequest is defined', () => {
        msalGuardConfig.authRequest = { scopes: ['User.Read'] }

        service.login();

        expect(msalService.loginRedirect).toHaveBeenCalledWith({
            ...{ scopes: ['User.Read'] }
        } as RedirectRequest);
    });

    it('login - should call loginRedirect without parameters if msalGuardConfig.authRequest is not defined', () => {
        msalGuardConfig.authRequest = undefined;

        service.login();

        expect(msalService.loginRedirect).toHaveBeenCalledWith();
    });

    it('logout - should call logout on msalService and clear the token cache', () => {
        (service as any).cachedAccessToken = 'cached-token';
        (service as any).tokenExpiresOn = new Date(Date.now() + 10 * 60 * 1000);

        service.logout();

        expect(msalService.logout).toHaveBeenCalled();
        expect((service as any).cachedAccessToken).toBeNull();
        expect((service as any).tokenExpiresOn).toBeNull();
    });

    it('checkAndSetActiveAccount - should set the first account as active if no active account is set', () => {
        msalInstanceSpy.setActiveAccount.calls.reset();
        msalInstanceSpy.getActiveAccount.calls.reset();
        msalInstanceSpy.getAllAccounts.calls.reset();
        const accounts = [{ username: 'testuser' }];
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        msalInstanceSpy.getAllAccounts.and.returnValue(accounts);
        service.checkAndSetActiveAccount();
        expect(msalInstanceSpy.setActiveAccount).toHaveBeenCalledWith(accounts[0]);
        expect(msalInstanceSpy.getActiveAccount).toHaveBeenCalled();
        expect(msalInstanceSpy.getAllAccounts).toHaveBeenCalled();
    });

    it('checkAndSetActiveAccount - should not set active account if an active account is already set', fakeAsync(() => {
        msalInstanceSpy.setActiveAccount.calls.reset();
        msalInstanceSpy.getActiveAccount.calls.reset();
        const activeAccount = { username: 'activeuser' };
        msalInstanceSpy.getActiveAccount.and.returnValue(activeAccount);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: fakeToken }));
        spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(new Blob())));
        service.checkAndSetActiveAccount();
        tick();
        expect(msalInstanceSpy.setActiveAccount).not.toHaveBeenCalled();
        expect(msalInstanceSpy.getActiveAccount).toHaveBeenCalled();
    }));

    it('checkAndSetActiveAccount - should not set active account if there are no accounts', () => {
        msalInstanceSpy.setActiveAccount.calls.reset();
        msalInstanceSpy.getActiveAccount.calls.reset();
        msalInstanceSpy.getAllAccounts.calls.reset();
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        msalInstanceSpy.getAllAccounts.and.returnValue([]);
        service.checkAndSetActiveAccount();
        expect(msalInstanceSpy.setActiveAccount).not.toHaveBeenCalled();
        expect(msalInstanceSpy.getActiveAccount).toHaveBeenCalled();
        expect(msalInstanceSpy.getAllAccounts).toHaveBeenCalled();
    });

    it('checkAndSetActiveAccount - should call refreshLoggedUser', () => {
        msalInstanceSpy.setActiveAccount.calls.reset();
        msalInstanceSpy.getActiveAccount.calls.reset();
        msalInstanceSpy.getAllAccounts.calls.reset();
        spyOn(service, 'refreshLoggedUser');
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        msalInstanceSpy.getAllAccounts.and.returnValue([{ username: 'testuser' }]);
        service.checkAndSetActiveAccount();
        expect(service.refreshLoggedUser).toHaveBeenCalled();
    });
    
    it('ngOnDestroy - should complete the _destroying$ subject', () => {
        spyOn(service[destroyingMethodName], 'next');
        spyOn(service[destroyingMethodName], 'complete');

        service.ngOnDestroy();

        expect(service[destroyingMethodName].next).toHaveBeenCalledWith(undefined);
        expect(service[destroyingMethodName].complete).toHaveBeenCalled();
    });

    it('getRefreshedAccessToken - should return an observable that emits the access token', (done) => {
        const expectedToken = 'test-access-token';
        const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: expectedToken, expiresOn }));

        service.getRefreshedAccessToken().subscribe((token) => {
            expect(token).toEqual(expectedToken);
            done();
        });
    });

    it('getRefreshedAccessToken - should handle error when acquiring token fails', (done) => {
        const expectedError = new Error('Error acquiring token');
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.reject(expectedError));

        service.getRefreshedAccessToken().subscribe({
            next: () => fail('Expected observable to error'),
            error: (error) => {
                expect(error).toEqual(expectedError);
                done();
            }
        });
    });

    describe('getAccessToken', () => {
        it('should call acquireTokenSilent and return access token', async () => {
            const expectedToken = 'test-access-token';
            const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
            msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: expectedToken, expiresOn }));

            const token = await service.getAccessToken();

            expect(token).toBe(expectedToken);
            expect(msalInstanceSpy.acquireTokenSilent).toHaveBeenCalledWith(jasmine.objectContaining({ scopes: ['User.Read'] }));
        });

        it('should return cached token if still valid', async () => {
            const expectedToken = 'cached-token';
            const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
            msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: expectedToken, expiresOn }));

            await service.getAccessToken(); // Populate cache
            msalInstanceSpy.acquireTokenSilent.calls.reset();

            const token = await service.getAccessToken(); // Should use cache

            expect(token).toBe(expectedToken);
            expect(msalInstanceSpy.acquireTokenSilent).not.toHaveBeenCalled();
        });

        it('should call acquireTokenSilent when forceRefresh is true even if cached', async () => {
            const initialToken = 'initial-token';
            const refreshedToken = 'refreshed-token';
            const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
            msalInstanceSpy.acquireTokenSilent.and.returnValues(
                Promise.resolve({ accessToken: initialToken, expiresOn }),
                Promise.resolve({ accessToken: refreshedToken, expiresOn })
            );

            await service.getAccessToken(); // Populate cache
            const token = await service.getAccessToken(true); // Force refresh

            expect(token).toBe(refreshedToken);
            expect(msalInstanceSpy.acquireTokenSilent).toHaveBeenCalledTimes(2);
        });

        it('should call acquireTokenSilent when cached token is within expiry buffer', async () => {
            const expiredToken = 'near-expiry-token';
            const newToken = 'new-token';
            // Expires in 4 minutes — within the 5-minute buffer, so should be treated as expired
            const nearExpiryDate = new Date(Date.now() + 4 * 60 * 1000);
            const validDate = new Date(Date.now() + 10 * 60 * 1000);
            msalInstanceSpy.acquireTokenSilent.and.returnValues(
                Promise.resolve({ accessToken: expiredToken, expiresOn: nearExpiryDate }),
                Promise.resolve({ accessToken: newToken, expiresOn: validDate })
            );

            await service.getAccessToken(); // Populate cache with near-expiry token
            const token = await service.getAccessToken(); // Should fetch a new token

            expect(token).toBe(newToken);
            expect(msalInstanceSpy.acquireTokenSilent).toHaveBeenCalledTimes(2);
        });

        it('should throw an error when there is no active account and no accounts are available', async () => {
            msalInstanceSpy.getActiveAccount.and.returnValue(null);
            msalInstanceSpy.getAllAccounts.and.returnValue([]);

            await expectAsync(service.getAccessToken()).toBeRejectedWithError('No accounts found. User must sign in first.');
        });

        it('should fall back to empty scopes when getConfig returns null', async () => {
            appConfigServiceSpy.getConfig.and.returnValue(null);
            const expectedToken = 'test-token';
            const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
            msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: expectedToken, expiresOn }));

            const token = await service.getAccessToken();

            expect(token).toBe(expectedToken);
            expect(msalInstanceSpy.acquireTokenSilent).toHaveBeenCalledWith(jasmine.objectContaining({ scopes: [] }));
        });
    });

});
