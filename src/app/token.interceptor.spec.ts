import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { AzureService } from './services/azure.service';
import { tokenInterceptor } from './token.interceptor';

type URLConstructor = typeof URL;

describe('TokenInterceptor', () => {

  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockAzureService: jasmine.SpyObj<AzureService>;

  beforeEach(() => {
    mockAzureService = jasmine.createSpyObj('AzureService', ['getAccessToken', 'login']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        { provide: AzureService, useValue: mockAzureService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
  })

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should add an Authorization header', fakeAsync(() => {
    mockAzureService.getAccessToken.and.returnValue(Promise.resolve('test-token'));

    http.get('/component-catalog/test').subscribe(() => {});
    tick();

    const req = httpTestingController.expectOne(
      (r) => {
        return r.headers.has('Authorization') && r.headers.get('Authorization') === 'Bearer test-token'
      }
    );
    expect(req.request.method).toEqual('GET');

    req.flush({ hello: 'world' });
    tick();
    httpTestingController.verify();
  }));

  it('should refresh token on 401 or 403 error and retry the request', fakeAsync(() => {
    mockAzureService.getAccessToken.and.callFake((forceRefresh?: boolean) =>
      Promise.resolve(forceRefresh ? 'new-token' : 'expired-token')
    );

    http.get('/component-catalog/test').subscribe(() => {});
    tick();

    const req = httpTestingController.expectOne(
      (r) => {
        return r.headers.has('Authorization') && r.headers.get('Authorization') === 'Bearer expired-token'
      }
    );
    expect(req.request.method).toEqual('GET');

    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    tick(); // Resolve the force-refresh getAccessToken(true) promise

    const newReq = httpTestingController.expectOne(
      (r) => {
        return r.headers.has('Authorization') && r.headers.get('Authorization') === 'Bearer new-token'
      }
    );
    expect(newReq.request.method).toEqual('GET');

    newReq.flush({ hello: 'world' });

    httpTestingController.verify();
  }));

  it('should do nothing on refresh token failure', fakeAsync(() => {
    mockAzureService.getAccessToken.and.callFake((forceRefresh?: boolean) =>
      forceRefresh ? Promise.reject(new Error('Refresh token failed')) : Promise.resolve('expired-token')
    );

    http.get('/component-catalog/test').subscribe({
      error: () => {}
    });
    tick();

    const req = httpTestingController.expectOne('/component-catalog/test');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    tick();
    httpTestingController.verify();
  }));

  it('should navigate to /page-not-found when retry request fails with 403', fakeAsync(() => {
    const mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockAzureService.getAccessToken.and.callFake((forceRefresh?: boolean) =>
      Promise.resolve(forceRefresh ? 'new-token' : 'expired-token')
    );

    http.get('/component-catalog/test').subscribe({ error: () => {} });
    tick();

    const req = httpTestingController.expectOne(
      (r) => r.headers.get('Authorization') === 'Bearer expired-token'
    );
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    tick(); // Resolve the force-refresh getAccessToken(true) promise

    const retryReq = httpTestingController.expectOne(
      (r) => r.headers.get('Authorization') === 'Bearer new-token'
    );
    retryReq.flush(null, { status: 403, statusText: 'Forbidden' });

    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/page-not-found']);
    httpTestingController.verify();
  }));

  it('should pass through non-401/403 errors', fakeAsync(() => {
    mockAzureService.getAccessToken.and.returnValue(Promise.resolve('test-token'));

    http.get('/component-catalog/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
      }
    });
    tick();

    const req = httpTestingController.expectOne('/component-catalog/test');
    req.flush(null, { status: 500, statusText: 'Server Error' });

    httpTestingController.verify();
  }));

  it('should bypass token injection for non-protected requests', fakeAsync(() => {
    http.get('/assets/logo.svg').subscribe(() => {});
    tick();

    const req = httpTestingController.expectOne('/assets/logo.svg');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(mockAzureService.getAccessToken).not.toHaveBeenCalled();
    req.flush({});
  }));

  it('should bypass token injection when URL parsing throws', fakeAsync(() => {
    const originalUrl = window.URL;
    // Force the URL parsing branch in isProtectedApiRequest to hit catch.
    (window as unknown as { URL: URLConstructor }).URL = function () {
      throw new TypeError('Invalid URL');
    } as unknown as URLConstructor;

    try {
      http.get('http://example.invalid/test').subscribe(() => {});
      tick();

      const req = httpTestingController.expectOne('http://example.invalid/test');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      expect(mockAzureService.getAccessToken).not.toHaveBeenCalled();
      req.flush({});
    } finally {
      (window as unknown as { URL: URLConstructor }).URL = originalUrl;
    }
  }));

  it('should trigger login and cancel protected request when no account is available', fakeAsync(() => {
    mockAzureService.getAccessToken.and.returnValue(Promise.reject(new Error('No accounts found. User must sign in first.')));

    let completed = false;
    http.get('/component-catalog/test').subscribe({
      complete: () => {
        completed = true;
      }
    });
    tick();

    httpTestingController.expectNone('/component-catalog/test');
    expect(mockAzureService.login).toHaveBeenCalled();
    expect(completed).toBeTrue();
  }));

  it('should rethrow token acquisition errors that are not no-account errors', fakeAsync(() => {
    const expectedError = new Error('Unexpected token failure');
    mockAzureService.getAccessToken.and.returnValue(Promise.reject(expectedError));

    let actualError: unknown;
    http.get('/component-catalog/test').subscribe({
      error: (error) => {
        actualError = error;
      }
    });
    tick();

    httpTestingController.expectNone('/component-catalog/test');
    expect(mockAzureService.login).not.toHaveBeenCalled();
    expect(actualError).toBe(expectedError);
  }));
  
});