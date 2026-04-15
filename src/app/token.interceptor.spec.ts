import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { AzureService } from './services/azure.service';
import { tokenInterceptor } from './token.interceptor';

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

    http.get('/test').subscribe(() => {});
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

    http.get('/test').subscribe(() => {});
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

    http.get('/test').subscribe({
      error: () => {}
    });
    tick();

    const req = httpTestingController.expectOne('/test');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    tick();
    httpTestingController.verify();
  }));

  it('should navigate to /page-not-found when retry request fails with 403', fakeAsync(() => {
    const mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockAzureService.getAccessToken.and.callFake((forceRefresh?: boolean) =>
      Promise.resolve(forceRefresh ? 'new-token' : 'expired-token')
    );

    http.get('/test').subscribe({ error: () => {} });
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

    http.get('/test').subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
      }
    });
    tick();

    const req = httpTestingController.expectOne('/test');
    req.flush(null, { status: 500, statusText: 'Server Error' });

    httpTestingController.verify();
  }));
  
});