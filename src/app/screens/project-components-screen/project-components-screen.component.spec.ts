import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectComponentsScreenComponent } from './project-components-screen.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { Subject, of, throwError } from 'rxjs';
import { AppProject } from '../../models/project';
import { RequestDeletionDialogComponent } from '../../components/request-deletion-dialog/request-deletion-dialog.component';
import { ProjectComponent } from '../../models/project-component';
import { ProvisionerService } from '../../services/provisioner.service';
import { AzureService } from '../../services/azure.service';
import { AppShellNotification, AppShellToastService } from '@opendevstack/ngx-appshell';
import { AppUser } from '../../models/app-user';

describe('ProjectComponentsScreenComponent', () => {
  let component: ProjectComponentsScreenComponent;
  let fixture: ComponentFixture<ProjectComponentsScreenComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteSubject: Subject<any>;
  let projectSubject: Subject<AppProject | null>;
  let provisionerServiceSpy: jasmine.SpyObj<ProvisionerService>;
  let azureServiceSpy: jasmine.SpyObj<AzureService>;
  let appShellToastServiceSpy: jasmine.SpyObj<AppShellToastService>;

  beforeEach(async () => {
    activatedRouteSubject = new Subject<any>();
    projectSubject = new Subject<AppProject | null>();
    projectServiceSpy = jasmine.createSpyObj(
      'ProjectService',
      ['ensureUserProjectsLoaded', 'getCurrentProject', 'setCurrentProject', 'getProjectComponents'],
      { project$: projectSubject.asObservable() }
    );
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    provisionerServiceSpy = jasmine.createSpyObj('ProvisionerService', ['requestComponentDeletion']);
    azureServiceSpy = jasmine.createSpyObj('AzureService', ['getRefreshedAccessToken'], { loggedUser$: of({username: 'test-user'} as AppUser) });
    appShellToastServiceSpy = jasmine.createSpyObj('AppShellToastService', ['showToast']);

    await TestBed.configureTestingModule({
      imports: [ProjectComponentsScreenComponent],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { params: activatedRouteSubject.asObservable() } },
        { provide: ProvisionerService, useValue: provisionerServiceSpy },
        { provide: AzureService, useValue: azureServiceSpy },
        { provide: AppShellToastService, useValue: appShellToastServiceSpy }
      ]
    })
    .compileComponents();

    projectServiceSpy.ensureUserProjectsLoaded.and.returnValue(of(['PROJECT_1', 'PROJECT_2']));
    projectServiceSpy.getCurrentProject.and.returnValue({ projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject);
    projectServiceSpy.getProjectComponents.and.returnValue(of([]));
    provisionerServiceSpy.requestComponentDeletion.and.returnValue(of(void 0));
    appShellToastServiceSpy.showToast.and.returnValue(void 0);
    azureServiceSpy.getRefreshedAccessToken.and.returnValue(of('test-access-token'));

    fixture = TestBed.createComponent(ProjectComponentsScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update selectedProject and breadcrumbs when project$ emits a project', () => {
    const project = { projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject;

    projectSubject.next(project);

    expect(component.selectedProject).toEqual(project);
    expect(component.breadcrumbLinks.length).toBe(2);
    expect(component.breadcrumbLinks[0].label).toBe('Project PROJECT_1');
    expect(component.breadcrumbLinks[1].label).toBe('My Components');
  });

  it('should not update breadcrumbs when project$ emits null', () => {
    component.breadcrumbLinks = [];

    projectSubject.next(null);

    expect(component.selectedProject).toBeNull();
    expect(component.breadcrumbLinks).toEqual([]);
  });

  it('should build breadcrumb links via updateBreadcrumbs()', () => {
    component.updateBreadcrumbs({ projectKey: 'PROJECT_2', location: 'LOC_1' } as AppProject);

    expect(component.breadcrumbLinks).toEqual([
      { anchor: '', label: 'Project PROJECT_2' },
      { anchor: '', label: 'My Components' }
    ]);
  });

  it('should navigate to page-not-found if projectKey is missing', () => {
    activatedRouteSubject.next({});
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/page-not-found', { replaceUrl: true });
  });

  it('should navigate to page-not-found if projectKey is not in user projects', () => {
    activatedRouteSubject.next({ projectKey: 'NOT_ALLOWED' });
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/page-not-found', { replaceUrl: true });
  });

  it('should set current project from route when allowed and different', () => {
    projectServiceSpy.getCurrentProject.and.returnValue({ projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject);

    activatedRouteSubject.next({ projectKey: 'PROJECT_2' });

    expect(projectServiceSpy.setCurrentProject).toHaveBeenCalledWith('PROJECT_2');
  });

  it('should set current project when no current project exists', () => {
    projectServiceSpy.getCurrentProject.and.returnValue(null as unknown as AppProject);

    activatedRouteSubject.next({ projectKey: 'PROJECT_2' });

    expect(projectServiceSpy.setCurrentProject).toHaveBeenCalledWith('PROJECT_2');
  });

  it('should not set current project when route matches current', () => {
    projectServiceSpy.setCurrentProject.calls.reset();
    projectServiceSpy.getCurrentProject.and.returnValue({ projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject);

    activatedRouteSubject.next({ projectKey: 'PROJECT_1' });

    expect(projectServiceSpy.setCurrentProject).not.toHaveBeenCalled();
  });

  it('should unsubscribe on destroy (no further reactions)', () => {
    projectServiceSpy.setCurrentProject.calls.reset();
    routerSpy.navigateByUrl.calls.reset();

    component.ngOnDestroy();

    projectSubject.next({ projectKey: 'PROJECT_2', location: 'LOC_1' } as AppProject);
    activatedRouteSubject.next({ projectKey: 'NOT_ALLOWED' });

    expect(component.selectedProject).toBeNull();
    expect(component.breadcrumbLinks).toEqual([]);
    expect(projectServiceSpy.setCurrentProject).not.toHaveBeenCalled();
    expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
  });

  describe('onRequestDeletionClicked', () => {
    it('should not open dialog if selectedProject is null', () => {
      const testComponent = {
        name: 'test-component',
        status: 'CREATED',
        logo: 'http://example.com/logo.png',
        url: 'http://example.com',
        canDelete: true
      } as ProjectComponent;
      component.selectedProject = null;
      const dialogSpy = spyOn(component.dialog, 'open');

      component.onRequestDeletionClicked(testComponent);

      expect(dialogSpy).not.toHaveBeenCalled();
    });

    it('should open dialog with component name', () => {
      const testComponent = {
        name: 'test-component',
        status: 'CREATED',
        logo: 'http://example.com/logo.png',
        url: 'http://example.com',
        canDelete: true
      } as ProjectComponent;
      component.selectedProject = { projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject;
      const dialogSpy = spyOn(component.dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);

      component.onRequestDeletionClicked(testComponent);

      expect(dialogSpy).toHaveBeenCalledWith(RequestDeletionDialogComponent, {
        autoFocus: false,
        data: { 
          componentName: 'test-component',
          projectKey: 'PROJECT_1',
          location: 'LOC_1'
        }
      });
    });

    it('should open dialog with correct data for different component', () => {
      const testComponent = {
        name: 'another-test-component',
        status: 'CREATING',
        logo: null,
        url: 'http://example.com/another',
        canDelete: false
      } as ProjectComponent;
      component.selectedProject = { projectKey: 'PROJECT_2', location: 'LOC_2' } as AppProject;
      const dialogSpy = spyOn(component.dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);

      component.onRequestDeletionClicked(testComponent);

      expect(dialogSpy).toHaveBeenCalledWith(RequestDeletionDialogComponent, {
        autoFocus: false,
        data: { 
          componentName: 'another-test-component',
          projectKey: 'PROJECT_2',
          location: 'LOC_2'
        }
      });
    });

    it('should show success toast when deletion request succeeds and status is set to deleting', () => {
      component.projectComponents = [{
        name: 'test-component',
        status: 'CREATED',
        logo: 'http://example.com/logo.png',
        url: 'http://example.com',
        canDelete: true
      } as ProjectComponent];
      const testComponent = {
        name: 'test-component',
        status: 'CREATED',
        logo: 'http://example.com/logo.png',
        url: 'http://example.com',
        canDelete: true
      } as ProjectComponent;
      component.selectedProject = { projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject;
      const mockResult = {
        deploymentStatus: true,
        changeNumber: 'CHG1234567',
        reason: 'Test reason',
        projectKey: 'PROJECT_1',
        componentName: 'test-component',
        location: 'LOC_1'
      };
      spyOn(component.dialog, 'open').and.returnValue({ 
        afterClosed: () => of(mockResult) 
      } as any);

      component.onRequestDeletionClicked(testComponent);
      expect(component.projectComponents[0].status).toBe('DELETING');
      expect(provisionerServiceSpy.requestComponentDeletion).toHaveBeenCalledWith(
        'PROJECT_1',
        'test-component',
        'test-user',
        'LOC_1',
        true,
        'CHG1234567',
        'Test reason',
        'test-access-token'
      );
      expect(appShellToastServiceSpy.showToast).toHaveBeenCalledWith({
        id: '',
        read: false,
        subject: 'only_toast',
        title: 'The request has successfully been sent. Support will receive a Service Now ticket and manage the component deletion.'
      } as AppShellNotification, 8000);
    });

    it('should show error toast when deletion request fails', () => {
      component.projectComponents = [{
        name: 'test-component',
        status: 'CREATED',
        logo: 'http://example.com/logo.png',
        url: 'http://example.com',
        canDelete: true
      } as ProjectComponent];
      const testComponent = {
        name: 'test-component',
        status: 'CREATED',
        logo: 'http://example.com/logo.png',
        url: 'http://example.com',
        canDelete: true
      } as ProjectComponent;
      component.selectedProject = { projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject;
      const mockResult = {
        deploymentStatus: true,
        changeNumber: 'CHG1234567',
        reason: 'Test reason',
        projectKey: 'PROJECT_1',
        componentName: 'test-component',
        location: 'LOC_1'
      };
      spyOn(component.dialog, 'open').and.returnValue({ 
        afterClosed: () => of(mockResult) 
      } as any);
      provisionerServiceSpy.requestComponentDeletion.and.returnValue(throwError(() => new Error('Deletion failed')));
      component.onRequestDeletionClicked(testComponent);
      expect(provisionerServiceSpy.requestComponentDeletion).toHaveBeenCalledWith(
        'PROJECT_1',
        'test-component',
        'test-user',
        'LOC_1',
        true,
        'CHG1234567',
        'Test reason',
        'test-access-token'
      );
      expect(appShellToastServiceSpy.showToast).toHaveBeenCalledWith({
        id: '',
        read: false,
        subject: 'only_toast',
        title: 'Something went wrong. Please try again later.'
      } as AppShellNotification, 8000);
    });

    it('should use unknown user when not present', () => {
      component.projectComponents = [{
        name: 'test-component',
        status: 'CREATED',
        logo: 'http://example.com/logo.png',
        url: 'http://example.com',
        canDelete: true
      } as ProjectComponent];
      const testComponent = {
        name: 'test-component',
        status: 'CREATED',
        logo: 'http://example.com/logo.png',
        url: 'http://example.com',
        canDelete: true
      } as ProjectComponent;
      component.selectedProject = { projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject;
      const mockResult = {
        deploymentStatus: true,
        changeNumber: 'CHG1234567',
        reason: 'Test reason',
        projectKey: 'PROJECT_1',
        componentName: 'test-component',
        location: 'LOC_1'
      };
      spyOn(component.dialog, 'open').and.returnValue({ 
        afterClosed: () => of(mockResult) 
      } as any);
      component.loggedUser = null;
      component.onRequestDeletionClicked(testComponent);
      expect(provisionerServiceSpy.requestComponentDeletion).toHaveBeenCalledWith(
        'PROJECT_1',
        'test-component',
        'unknown',
        'LOC_1',
        true,
        'CHG1234567',
        'Test reason',
        'test-access-token'
      );
    });
  });

  it('should load project components when project$ emits', () => {
    const mockComponents = [
      { name: 'component1', status: 'Active' },
      { name: 'component2', status: 'Inactive' }
    ];
    projectServiceSpy.getProjectComponents.and.returnValue(of(mockComponents as any));
    const project = { projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject;

    projectSubject.next(project);

    expect(projectServiceSpy.getProjectComponents).toHaveBeenCalledWith('PROJECT_1');
    expect(component.projectComponents).toEqual(mockComponents as any);
  });

  it('should handle error when getProjectComponents fails', () => {
    projectServiceSpy.getProjectComponents.and.returnValue(throwError(() => new Error('Error loading components')));
    const project = { projectKey: 'PROJECT_1', location: 'LOC_1' } as AppProject;

    projectSubject.next(project);

    expect(projectServiceSpy.getProjectComponents).toHaveBeenCalledWith('PROJECT_1');
    expect(component.connectionErrorHtmlMessage).toBe('Sorry, we are having trouble loading the page.<br/>Please check back in a few minutes.');
    expect(component.connectionErrorIcon).toBe('smiley_sad');
    expect(component.isLoading).toBe(false);
  });
});
