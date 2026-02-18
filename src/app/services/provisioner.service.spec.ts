import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { provideHttpClient } from '@angular/common/http';
import { BASE_PATH, ProjectInfo, ProjectsService } from '../openapi/projects-info-service';
import { ProjectComponentsService } from '../openapi/component-catalog';
import { AzureService } from './azure.service';
import { AuthenticationResult } from "@azure/msal-browser";
import { Observable, of, throwError } from 'rxjs';
import { CatalogService } from './catalog.service';
import { ProvisionerService } from './provisioner.service';
import { CreateIncidentAction, ProvisionResultsService } from '../openapi/component-provisioner';

describe('ProvisionerService', () => {
  let service: ProvisionerService;
  let provisionResultsServiceSpy: jasmine.SpyObj<ProvisionResultsService>;

  beforeEach(() => {
    localStorage.clear();
    provisionResultsServiceSpy = jasmine.createSpyObj('ProvisionResultsService', ['createIncident']);

    TestBed.configureTestingModule({
      providers: [
        ProvisionerService,
        { provide: ProvisionResultsService, useValue: provisionResultsServiceSpy },
        provideHttpClient()
      ]
    });

    provisionResultsServiceSpy.createIncident.and.returnValue(of({} as any));

    service = TestBed.inject(ProvisionerService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('requestComponentDeletion should call createIncident with correct parameters', fakeAsync(() => {
    const projectKey = 'TEST_PROJECT';
    const componentName = 'TEST_COMPONENT';
    const username = 'test-user';
    const location = 'test-location';
    const reason = 'No longer needed';
    const deploymentStatus = false;
    const changeNumber = '-';
    const accessToken = 'test-access-token';

    service.requestComponentDeletion(projectKey, componentName, username, location, deploymentStatus, changeNumber, reason, accessToken).subscribe();

    flushMicrotasks();

    const expectedAction = {
      parameters: [
        { name: 'cluster_location', type: 'string', value: location as String },
        { name: 'caller', type: 'string', value: username as String },
        { name: 'is_deployed', type: 'boolean', value: deploymentStatus as Boolean },
        { name: 'change_number', type: 'string', value: changeNumber as String },
        { name: 'reason', type: 'string', value: reason as String },
        { name: 'access_token', type: 'string', value: accessToken as String }
      ]
    } as CreateIncidentAction;

    expect(provisionResultsServiceSpy.createIncident).toHaveBeenCalledWith(projectKey,componentName,expectedAction);
  }));

});