import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService } from "@azure/msal-angular";
import { AuthenticationResult, EventMessage, EventType, InteractionStatus, InteractionType, RedirectRequest } from '@azure/msal-browser';
import { BehaviorSubject, firstValueFrom, of, Subject, throwError } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { AzureService } from './azure.service';
import { AzureGroupsService } from '../openapi/projects-info-service';

const destroyingMethodName = '_destroying$';
const fakeToken = 'test-token';

describe('AzureService', () => {
    let service: AzureService;
    let msalService: jasmine.SpyObj<MsalService>;
    const msalGuardConfig: jasmine.SpyObj<MsalGuardConfiguration> = jasmine.createSpyObj('MsalGuardConfiguration', ['authRequest', 'interactionType']);
    let msalSubject$: Subject<EventMessage>;
    let inProgress$: Subject<InteractionStatus>;
    const msalInstanceSpy = jasmine.createSpyObj('instance', ['getAllAccounts', 'getActiveAccount', 'setActiveAccount', 'acquireTokenSilent']);
    const mockRouter: jasmine.SpyObj<Router> =  jasmine.createSpyObj('Router', ['navigate']);;
    const appConfigServiceSpy = jasmine.createSpyObj('AppConfigService', ['getConfig']);    
    const azureGroupsServiceSpy = jasmine.createSpyObj('AzureGroupsService', ['getAzureGroups']);

    beforeEach(() => {
        msalSubject$ = new Subject<EventMessage>();
        inProgress$ = new BehaviorSubject<InteractionStatus>(InteractionStatus.Startup);
        
        const msalServiceSpy = jasmine.createSpyObj('MsalService', ['handleRedirectObservable', 'instance', 'loginRedirect', 'logoutRedirect']);
        msalServiceSpy.handleRedirectObservable.and.returnValue(of({} as AuthenticationResult));
        msalServiceSpy.loginRedirect.and.returnValue(of(void 0));
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
                { provide: AppConfigService, useValue: appConfigServiceSpy },
                { provide: AzureGroupsService, useValue: azureGroupsServiceSpy }
            ]
        });

        service = TestBed.inject(AzureService);
        msalService = TestBed.inject(MsalService) as jasmine.SpyObj<MsalService>;
        mockRouter.navigate.calls.reset();
        msalInstanceSpy.getAllAccounts.calls.reset();
        msalInstanceSpy.getActiveAccount.calls.reset();
        msalInstanceSpy.setActiveAccount.calls.reset();
        msalInstanceSpy.getAllAccounts.and.returnValue([{}]);
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        msalInstanceSpy.acquireTokenSilent.calls.reset();
        azureGroupsServiceSpy.getAzureGroups.and.returnValue(of([]));
        msalService.instance = msalInstanceSpy;
        msalGuardConfig.authRequest = undefined;
        msalGuardConfig.interactionType = InteractionType.Redirect;
    });

    afterEach(() => {
        service.ngOnDestroy();
    });

    it('should initialize properties in the constructor', () => {
        expect(service.isIframe).toBeFalse();
        expect(service.loginDisplay).toBeFalse();
        expect(service.isFirstTime).toBeTrue();
        expect(service.loggedUser$).toBeInstanceOf(BehaviorSubject);
        expect(service.loggedUser$.value).toBeNull();
        expect(service.userGroups$.value).toEqual([]);
    });

    describe('initialize', () => {
        beforeEach(() => {
            spyOn(service, 'checkAndSetActiveAccount');
        });

        for (const frame of [
            { name: 'top-level window', parent: window, opener: null, expected: false },
            { name: 'embedded frame', parent: {} as Window, opener: null, expected: true },
            { name: 'frame with an opener', parent: {} as Window, opener: window, expected: false }
        ]) {
            it(`should initialize the ${frame.name} and account display`, () => {
                spyOnProperty(window, 'parent', 'get').and.returnValue(frame.parent);
                spyOnProperty(window, 'opener', 'get').and.returnValue(frame.opener);

                service.initialize();

                expect(service.isIframe).toBe(frame.expected);
                expect(service.loginDisplay).toBeTrue();
                expect(service.checkAndSetActiveAccount).toHaveBeenCalledTimes(1);
                expect(msalService.handleRedirectObservable).toHaveBeenCalledTimes(1);
            });
        }

        it('should handle login and logout events but ignore unrelated events', () => {
            service.initialize();
            msalInstanceSpy.getAllAccounts.and.returnValue([]);

            msalSubject$.next({ eventType: EventType.ACQUIRE_TOKEN_SUCCESS } as EventMessage);
            expect(mockRouter.navigate).not.toHaveBeenCalled();
            expect(service.loginDisplay).toBeTrue();

            msalSubject$.next({ eventType: EventType.LOGOUT_SUCCESS } as EventMessage);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);

            msalInstanceSpy.getAllAccounts.and.returnValue([{}]);
            service.loginDisplay = false;
            msalSubject$.next({ eventType: EventType.LOGIN_SUCCESS } as EventMessage);
            expect(service.loginDisplay).toBeTrue();
            expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
        });

        it('should reset pending login and refresh accounts only when redirect interaction finishes', () => {
            service.initialize();
            (service as any).loginInProgress = true;
            msalInstanceSpy.getAllAccounts.and.returnValue([]);

            inProgress$.next(InteractionStatus.HandleRedirect);
            expect(service.checkAndSetActiveAccount).toHaveBeenCalledTimes(1);
            expect((service as any).loginInProgress).toBeTrue();

            inProgress$.next(InteractionStatus.None);
            expect(service.checkAndSetActiveAccount).toHaveBeenCalledTimes(2);
            expect(service.loginDisplay).toBeFalse();
            expect((service as any).loginInProgress).toBeFalse();
        });

        it('should reset login state and report a redirect failure', () => {
            const error = new Error('Redirect failed');
            const consoleErrorSpy = spyOn(console, 'error');
            msalService.handleRedirectObservable.and.returnValue(throwError(() => error));
            (service as any).loginInProgress = true;

            service.initialize();

            expect((service as any).loginInProgress).toBeFalse();
            expect(service.isFirstTime).toBeFalse();
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling login redirect', error);
        });

        it('should stop reacting to authentication and interaction events after destruction', () => {
            service.initialize();
            service.ngOnDestroy();
            msalInstanceSpy.getAllAccounts.and.returnValue([]);

            msalSubject$.next({ eventType: EventType.LOGOUT_SUCCESS } as EventMessage);
            inProgress$.next(InteractionStatus.None);

            expect(mockRouter.navigate).not.toHaveBeenCalled();
            expect(service.checkAndSetActiveAccount).toHaveBeenCalledTimes(1);
        });
    });

    it('refreshLoggedUser - should delay the first login by 100 milliseconds', fakeAsync(() => {
        const loginSpy = spyOn(service, 'login');

        service.refreshLoggedUser();

        expect(service.isFirstTime).toBeFalse();
        tick(99);
        expect(loginSpy).not.toHaveBeenCalled();
        tick(1);
        expect(loginSpy).toHaveBeenCalledTimes(1);
    }));

    it('refreshLoggedUser - should clear the logged-in user when no active account remains', () => {
        service.isFirstTime = false;
        service.loggedUser$.next({ fullName: 'Test User', username: 'user@example.com', projects: [] });

        service.refreshLoggedUser();

        expect(service.loggedUser$.value).toBeNull();
    });

    it('refreshLoggedUser - should publish the user and groups after loading the profile picture', fakeAsync(() => {
        const msalUser = { name: 'Test User', username: 'user@example.com' };
        const picture = new Blob(['profile']);
        msalInstanceSpy.getActiveAccount.and.returnValue(msalUser);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: fakeToken }));
        azureGroupsServiceSpy.getAzureGroups.and.returnValue(of(['GROUP_A']));
        const response = new Response(picture);
        spyOn(response, 'blob').and.resolveTo(picture);
        const fetchSpy = spyOn(window, 'fetch').and.resolveTo(response);
        const avatarSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:profile');

        service.refreshLoggedUser();
        flushMicrotasks();

        expect(msalInstanceSpy.acquireTokenSilent).toHaveBeenCalledWith({ scopes: ['User.Read'], account: msalUser });
        expect(fetchSpy).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/me/photo/$value', {
            headers: { Authorization: `Bearer ${fakeToken}` }
        });
        expect(avatarSpy).toHaveBeenCalledWith(picture);
        expect(service.loggedUser$.value).toEqual({
            fullName: msalUser.name,
            username: msalUser.username,
            avatarSrc: 'blob:profile',
            projects: []
        });
        expect(service.userGroups$.value).toEqual(['GROUP_A']);
    }));

    it('refreshLoggedUser - should publish the user even when token acquisition fails', fakeAsync(() => {
        const msalUser = { name: 'Test User' };
        const error = new Error('Error acquiring token silently');
        const consoleErrorSpy = spyOn(console, 'error');
        msalInstanceSpy.getActiveAccount.and.returnValue(msalUser);
        msalInstanceSpy.acquireTokenSilent.and.rejectWith(error);

        service.refreshLoggedUser();
        flushMicrotasks();

        expect(service.loggedUser$.value!.fullName).toBe(msalUser.name);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error acquiring token silently', error);
    }));

    it('refreshLoggedUser - should publish the user even when the profile request fails', fakeAsync(() => {
        const msalUser = { name: 'Test User' };
        const error = new Error('Error fetching profile picture');
        const consoleErrorSpy = spyOn(console, 'error');
        msalInstanceSpy.getActiveAccount.and.returnValue(msalUser);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: fakeToken }));
        spyOn(window, 'fetch').and.rejectWith(error);

        service.refreshLoggedUser();
        flushMicrotasks();

        expect(service.loggedUser$.value!.fullName).toBe(msalUser.name);
        expect(service.loggedUser$.value!.avatarSrc).toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching profile picture', error);
    }));

    it('refreshLoggedUser - should publish the user without an avatar when the picture is not found', fakeAsync(() => {
        const msalUser = { name: 'Test User' };
        const consoleWarnSpy = spyOn(console, 'warn');
        msalInstanceSpy.getActiveAccount.and.returnValue(msalUser);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: fakeToken }));
        spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(null, { status: 404 })));

        service.refreshLoggedUser();
        flushMicrotasks();

        expect(service.loggedUser$.value!.fullName).toBe(msalUser.name);
        expect(service.loggedUser$.value!.avatarSrc).toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith('Microsoft profile picture not found');
    }));

    for (const authRequest of [undefined, { scopes: ['User.Read'] } as RedirectRequest]) {
        describe(`login ${authRequest ? 'with' : 'without'} an auth request`, () => {
            beforeEach(() => {
                msalGuardConfig.authRequest = authRequest;
                msalInstanceSpy.getAllAccounts.and.returnValue([]);
            });

            it('should redirect once and ignore a duplicate login while pending', () => {
                service.login();
                service.login();

                expect(msalService.loginRedirect).toHaveBeenCalledTimes(1);
                if (authRequest) {
                    expect(msalService.loginRedirect).toHaveBeenCalledWith(authRequest);
                } else {
                    expect(msalService.loginRedirect).toHaveBeenCalledWith();
                }
            });

            for (const errorCode of ['some_other_error', 'interaction_in_progress']) {
                it(`should ${errorCode === 'interaction_in_progress' ? 'block' : 'allow'} retry after ${errorCode}`, () => {
                    const error = { errorCode };
                    const consoleErrorSpy = spyOn(console, 'error');
                    msalService.loginRedirect.and.returnValue(throwError(() => error));

                    service.login();
                    service.login();

                    if (errorCode === 'interaction_in_progress') {
                        expect(msalService.loginRedirect).toHaveBeenCalledTimes(1);
                        expect(consoleErrorSpy).not.toHaveBeenCalled();
                    } else {
                        expect(msalService.loginRedirect).toHaveBeenCalledTimes(2);
                        expect(consoleErrorSpy).toHaveBeenCalledWith('Error during login redirect', error);
                    }
                });
            }
        });
    }

    it('logout - should call logout on msalService and clear the token cache', () => {
        (service as any).cachedAccessToken = 'cached-token';
        (service as any).tokenExpiresOn = new Date(Date.now() + 10 * 60 * 1000);

        service.logout();

        expect(msalService.logoutRedirect).toHaveBeenCalled();
        expect((service as any).cachedAccessToken).toBeNull();
        expect((service as any).tokenExpiresOn).toBeNull();
    });

    it('checkAndSetActiveAccount - should set the first account as active if no active account is set', () => {
        const refreshSpy = spyOn(service, 'refreshLoggedUser');
        const accounts = [{ username: 'testuser' }];
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        msalInstanceSpy.getAllAccounts.and.returnValue(accounts);
        service.checkAndSetActiveAccount();
        expect(msalInstanceSpy.setActiveAccount).toHaveBeenCalledWith(accounts[0]);
        expect(msalInstanceSpy.getActiveAccount).toHaveBeenCalled();
        expect(msalInstanceSpy.getAllAccounts).toHaveBeenCalled();
        expect(refreshSpy).toHaveBeenCalledTimes(1);
    });

    it('checkAndSetActiveAccount - should preserve the existing active account and refresh the user', () => {
        const refreshSpy = spyOn(service, 'refreshLoggedUser');
        const activeAccount = { username: 'activeuser' };
        msalInstanceSpy.getActiveAccount.and.returnValue(activeAccount);

        service.checkAndSetActiveAccount();

        expect(msalInstanceSpy.setActiveAccount).not.toHaveBeenCalled();
        expect(msalInstanceSpy.getActiveAccount).toHaveBeenCalled();
        expect(refreshSpy).toHaveBeenCalledTimes(1);
    });

    it('checkAndSetActiveAccount - should not set active account if there are no accounts', () => {
        const refreshSpy = spyOn(service, 'refreshLoggedUser');
        msalInstanceSpy.getActiveAccount.and.returnValue(null);
        msalInstanceSpy.getAllAccounts.and.returnValue([]);
        service.checkAndSetActiveAccount();
        expect(msalInstanceSpy.setActiveAccount).not.toHaveBeenCalled();
        expect(msalInstanceSpy.getActiveAccount).toHaveBeenCalled();
        expect(msalInstanceSpy.getAllAccounts).toHaveBeenCalled();
        expect(refreshSpy).toHaveBeenCalledTimes(1);
    });

    it('ngOnDestroy - should complete the _destroying$ subject', () => {
        spyOn(service[destroyingMethodName], 'next');
        spyOn(service[destroyingMethodName], 'complete');

        service.ngOnDestroy();

        expect(service[destroyingMethodName].next).toHaveBeenCalledWith(undefined);
        expect(service[destroyingMethodName].complete).toHaveBeenCalled();
    });

    it('getRefreshedAccessToken - should return an observable that emits the access token', async () => {
        const expectedToken = 'test-access-token';
        const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.resolve({ accessToken: expectedToken, expiresOn }));

        expect(await firstValueFrom(service.getRefreshedAccessToken())).toBe(expectedToken);
    });

    it('getRefreshedAccessToken - should handle error when acquiring token fails', async () => {
        const expectedError = new Error('Error acquiring token');
        msalInstanceSpy.acquireTokenSilent.and.returnValue(Promise.reject(expectedError));

        await expectAsync(firstValueFrom(service.getRefreshedAccessToken())).toBeRejectedWith(expectedError);
    });

    it('loadUserGroups should return filtered groups', done => {
        azureGroupsServiceSpy.getAzureGroups.and.returnValue(
            of([
                'GROUP_A',
                '',
                'GROUP_B',
                null as any,
                undefined as any
            ])
        );

        service.loadUserGroups().subscribe(groups => {
            expect(groups).toEqual([
                'GROUP_A',
                'GROUP_B'
            ]);

            done();
        });
    });

    it('loadUserGroups should return empty array when service fails', done => {
        spyOn(console, 'error').and.stub();
        azureGroupsServiceSpy.getAzureGroups.and.returnValue(
            throwError(() => new Error('boom'))
        );

        service.loadUserGroups().subscribe(groups => {
            expect(groups).toEqual([]);

            done();
        });
    });

    it('loadUserGroups should return an empty array for a non-array response', async () => {
        azureGroupsServiceSpy.getAzureGroups.and.returnValue(of(null));

        expect(await firstValueFrom(service.loadUserGroups())).toEqual([]);
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
