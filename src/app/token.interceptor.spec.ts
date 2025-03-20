import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { AzureService } from './services/azure.service';
import { tokenInterceptor } from './token.interceptor';
import { AuthenticationResult } from '@azure/msal-browser';

describe('TokenInterceptor', () => {

  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockAzureService: jasmine.SpyObj<AzureService>;

  beforeEach(() => {
    mockAzureService = jasmine.createSpyObj('AzureService', ['getAccessToken', 'refreshToken']);

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
    mockAzureService.getAccessToken.and.returnValue('test-token');

    http.get('/test').subscribe(() => {});

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
    mockAzureService.getAccessToken.and.returnValue('expired-token');
    const newAuthResult: AuthenticationResult = { idToken: 'new-token' } as AuthenticationResult;
    mockAzureService.refreshToken.and.returnValue(Promise.resolve(newAuthResult));

    http.get('/test').subscribe(() => {});

    const req = httpTestingController.expectOne(
      (r) => {
        return r.headers.has('Authorization') && r.headers.get('Authorization') === 'Bearer expired-token'
      }
    );
    expect(req.request.method).toEqual('GET');

    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    tick(); // Simulate the passage of time for the retry

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
    mockAzureService.getAccessToken.and.returnValue('expired-token');
    mockAzureService.refreshToken.and.returnValue(Promise.reject(() => new Error('Refresh token failed')));

    http.get('/test').subscribe({
      error: () => {}
    });

    const req = httpTestingController.expectOne('/test');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    tick();
    httpTestingController.verify();
  }));

  it('should pass through non-401/403 errors', fakeAsync(() => {
    mockAzureService.getAccessToken.and.returnValue('test-token');

    http.get('/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
      }
    });

    const req = httpTestingController.expectOne('/test');
    req.flush(null, { status: 500, statusText: 'Server Error' });

    httpTestingController.verify();
  }));
  
});