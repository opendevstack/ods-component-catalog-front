import { provideHttpClient } from '@angular/common/http';
import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProvisionResultsService } from '../openapi/component-provisioner';
import { ProvisionerService } from './provisioner.service';

describe('ProvisionerService', () => {
  let service: ProvisionerService;
  let provisionResultsServiceSpy: jasmine.SpyObj<ProvisionResultsService>;

  beforeEach(() => {
    localStorage.clear();
    provisionResultsServiceSpy = jasmine.createSpyObj('ProvisionResultsService', ['requestDeletion']);

    TestBed.configureTestingModule({
      providers: [
        ProvisionerService,
        { provide: ProvisionResultsService, useValue: provisionResultsServiceSpy },
        provideHttpClient()
      ]
    });

    provisionResultsServiceSpy.requestDeletion.and.returnValue(of({} as any));

    service = TestBed.inject(ProvisionerService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('requestComponentDeletion should call requestDeletion with correct parameters', fakeAsync(() => {
    const projectKey = 'TEST_PROJECT';
    const componentName = 'TEST_COMPONENT';

    service.requestComponentDeletion(projectKey, componentName).subscribe();

    flushMicrotasks();

    expect(provisionResultsServiceSpy.requestDeletion).toHaveBeenCalledWith(projectKey,componentName);
  }));

});