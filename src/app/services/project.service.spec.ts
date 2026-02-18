import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { provideHttpClient } from '@angular/common/http';
import { BASE_PATH, ProjectInfo, ProjectsService } from '../openapi/projects-info-service';
import { ProjectComponentsService } from '../openapi/component-catalog';
import { AzureService } from './azure.service';
import { AuthenticationResult } from "@azure/msal-browser";
import { Observable, of, throwError } from 'rxjs';
import { CatalogService } from './catalog.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let azureServiceSpy: jasmine.SpyObj<AzureService>;
  let projectComponentsServiceSpy: jasmine.SpyObj<ProjectComponentsService>;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;

  beforeEach(() => {
    localStorage.clear();
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProjects']);
    azureServiceSpy = jasmine.createSpyObj('AzureService', ['getAzureProjects', 'refreshToken']);
    projectComponentsServiceSpy = jasmine.createSpyObj('ProjectComponentsService', ['listProjectComponents']);
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getProductImage']);

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: AzureService, useValue: azureServiceSpy },
        { provide: ProjectComponentsService, useValue: projectComponentsServiceSpy },
        { provide: CatalogService, useValue: catalogServiceSpy },
        provideHttpClient()
      ]
    });

    azureServiceSpy.refreshToken.and.returnValue(Promise.resolve({ accessToken: 'dummy-token' } as AuthenticationResult));
    catalogServiceSpy.getProductImage.and.returnValue(Promise.resolve('http://example.com/image.png'));

    service = TestBed.inject(ProjectService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('should get user projects', (done) => {
    const mockProjects: any = ['project1', 'project2'];
    projectsServiceSpy.getProjects.and.returnValue(of(mockProjects));

    service.getUserProjects('test-token').subscribe(projects => {
      expect(projects).toEqual(mockProjects);
      expect(service.getCachedUserProjects()).toEqual(mockProjects);
      expect(projectsServiceSpy.getProjects).toHaveBeenCalledWith('test-token');
      done();
    });
  });

  it('should return cached user projects without calling backend', () => {
    const mockProjects: any = ['project1', 'project2'];
    projectsServiceSpy.getProjects.and.returnValue(of(mockProjects));

    service.getUserProjects('test-token').subscribe();
    expect(service.getCachedUserProjects()).toEqual(mockProjects);

    projectsServiceSpy.getProjects.calls.reset();
    expect(service.getCachedUserProjects()).toEqual(mockProjects);
    expect(projectsServiceSpy.getProjects).not.toHaveBeenCalled();
  });

  it('should get project cluster', (done) => {
    const mockProjectInfo: ProjectInfo = { projectKey: 'project1', clusters: ['cluster1', 'cluster2'] };
    projectsServiceSpy.getProjectClusters = jasmine.createSpy().and.returnValue(of(mockProjectInfo));

    service.getProjectCluster('project1', 'test-token').subscribe(cluster => {
      expect(cluster).toBe('cluster1');
      expect(projectsServiceSpy.getProjectClusters).toHaveBeenCalledWith('test-token', 'project1');
      done();
    });
  });

  it('should return empty string when no clusters available', (done) => {
    const mockProjectInfo: ProjectInfo = { projectKey: 'project1', clusters: [] };
    projectsServiceSpy.getProjectClusters = jasmine.createSpy().and.returnValue(of(mockProjectInfo));

    service.getProjectCluster('project1', 'test-token').subscribe(cluster => {
      expect(cluster).toBe('');
      done();
    });
  });

  it('should get current project', () => {
    const mockProject = { projectKey: 'project1', location: 'cluster1' };
    localStorage.setItem('selectedProject', JSON.stringify(mockProject));
    
    // Create a fresh instance directly (bypass TestBed singleton) after installing the spy
    // so constructor runs with the spy in effect.
    const newService = new ProjectService(projectsServiceSpy as any, azureServiceSpy as any, projectComponentsServiceSpy as any, catalogServiceSpy as any);
    expect(newService.getCurrentProject()).toEqual(mockProject);
  });

  it('should return null when no project is stored', () => {
    expect(service.getCurrentProject()).toBeNull();
  });

  it('should set current project and store in localStorage', (done) => {
    const mockProjectInfo: ProjectInfo = { projectKey: 'project1', clusters: ['cluster1'] };
    projectsServiceSpy.getProjectClusters = jasmine.createSpy().and.returnValue(of(mockProjectInfo));

    service.setCurrentProject('project1');

    setTimeout(() => {
      const storedProject = JSON.parse(localStorage.getItem('selectedProject')!);
      expect(storedProject).toEqual({ projectKey: 'project1', location: 'cluster1' });
      expect(service.getCurrentProject()).toEqual({ projectKey: 'project1', location: 'cluster1' });
      expect(azureServiceSpy.refreshToken).toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should remove project when setting null', () => {
    localStorage.setItem('selectedProject', JSON.stringify({ projectKey: 'project1', location: 'cluster1' }));
    
    service.setCurrentProject(null);

    expect(localStorage.getItem('selectedProject')).toBeNull();
    expect(service.getCurrentProject()).toBeNull();
  });

  it('should handle localStorage errors gracefully', () => {
    spyOn(console, 'warn');
    spyOn(localStorage, 'getItem').and.throwError(new Error('Storage error'));

    // Create a fresh instance directly (bypass TestBed singleton) after installing the spy
    // so constructor runs with the spy in effect.
    const newService = new ProjectService(projectsServiceSpy as any, azureServiceSpy as any, projectComponentsServiceSpy as any, catalogServiceSpy as any);
    expect(newService.getCurrentProject()).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('Failed to access localStorage:', jasmine.any(Error));
  });

  it('should emit project changes through project$ observable', (done) => {
    const mockProjectInfo: ProjectInfo = { projectKey: 'project1', clusters: ['cluster1'] };
    projectsServiceSpy.getProjectClusters = jasmine.createSpy().and.returnValue(of(mockProjectInfo));

    service.project$.subscribe(project => {
      if (project) {
        expect(project).toEqual({ projectKey: 'project1', location: 'cluster1' });
        done();
      }
    });

    service.setCurrentProject('project1');
  });

  it('ensureUserProjectsLoaded should return cached value and not call refreshToken', (done) => {
    const mockProjects: string[] = ['project1', 'project2'];
    projectsServiceSpy.getProjects.and.returnValue(of(mockProjects as any) as any);

    service.getUserProjects('test-token').subscribe(() => {
      projectsServiceSpy.getProjects.calls.reset();
      azureServiceSpy.refreshToken.calls.reset();

      service.ensureUserProjectsLoaded().subscribe(projects => {
        expect(projects).toEqual(mockProjects);
        expect(azureServiceSpy.refreshToken).not.toHaveBeenCalled();
        expect(projectsServiceSpy.getProjects).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('ensureUserProjectsLoaded should return same in-flight request for concurrent calls', fakeAsync(() => {
    const mockProjects: string[] = ['project1', 'project2'];
    let resolveToken: ((value: any) => void) | null = null;
    const tokenPromise = new Promise<any>(resolve => {
      resolveToken = resolve;
    });

    azureServiceSpy.refreshToken.and.returnValue(tokenPromise as any);
    projectsServiceSpy.getProjects.and.returnValue(of(mockProjects as any) as any);

    const request1$ = service.ensureUserProjectsLoaded();
    const request2$ = service.ensureUserProjectsLoaded();

    expect(request2$).toBe(request1$);
    expect(azureServiceSpy.refreshToken).toHaveBeenCalledTimes(1);

    let result1: string[] | undefined;
    let result2: string[] | undefined;
    request1$.subscribe(r => (result1 = r));
    request2$.subscribe(r => (result2 = r));

    resolveToken!({ accessToken: 'dummy-token' });
    flushMicrotasks();

    expect(projectsServiceSpy.getProjects).toHaveBeenCalledTimes(1);
    expect(projectsServiceSpy.getProjects).toHaveBeenCalledWith('dummy-token');
    expect(result1).toEqual(mockProjects);
    expect(result2).toEqual(mockProjects);
    expect(service.getCachedUserProjects()).toEqual(mockProjects);
  }));

  it('ensureUserProjectsLoaded should load from backend when cache is empty and populate cache', fakeAsync(() => {
    const mockProjects: string[] = ['project1', 'project2'];
    azureServiceSpy.refreshToken.and.returnValue(Promise.resolve({ accessToken: 'dummy-token' } as any));
    projectsServiceSpy.getProjects.and.returnValue(of(mockProjects as any) as any);

    let result: string[] | undefined;
    service.ensureUserProjectsLoaded().subscribe(r => (result = r));
    flushMicrotasks();

    expect(result).toEqual(mockProjects);
    expect(service.getCachedUserProjects()).toEqual(mockProjects);
    expect(azureServiceSpy.refreshToken).toHaveBeenCalledTimes(1);
    expect(projectsServiceSpy.getProjects).toHaveBeenCalledWith('dummy-token');

    azureServiceSpy.refreshToken.calls.reset();
    projectsServiceSpy.getProjects.calls.reset();
    service.ensureUserProjectsLoaded().subscribe();

    expect(azureServiceSpy.refreshToken).not.toHaveBeenCalled();
    expect(projectsServiceSpy.getProjects).not.toHaveBeenCalled();
  }));

  it('ensureUserProjectsLoaded should reset in-flight request on error (finalize) and allow retry', fakeAsync(() => {
    azureServiceSpy.refreshToken.and.returnValue(Promise.resolve({ accessToken: 'dummy-token' } as any));
    projectsServiceSpy.getProjects.and.returnValue(throwError(() => new Error('backend error')));

    let firstError: any;
    service.ensureUserProjectsLoaded().subscribe({
      next: () => fail('Expected error'),
      error: err => (firstError = err)
    });
    flushMicrotasks();
    expect(firstError).toBeTruthy();
    expect((service as any).userProjectsSubject.value).toBeNull();

    projectsServiceSpy.getProjects.and.returnValue(of(['project1'] as any) as any);
    let retryResult: string[] | undefined;
    service.ensureUserProjectsLoaded().subscribe(r => (retryResult = r));
    flushMicrotasks();

    expect(azureServiceSpy.refreshToken).toHaveBeenCalledTimes(2);
    expect(retryResult).toEqual(['project1']);
    expect(service.getCachedUserProjects()).toEqual(['project1']);
  }));

  it('should ignore stale async cluster result when setCurrentProject is called again (requestId guard)', fakeAsync(() => {
    spyOn(localStorage, 'setItem').and.callThrough();

    const clusterObservers: Record<string, any> = {};

    projectsServiceSpy.getProjectClusters = jasmine.createSpy().and.callFake((_token: string, projectKey: string) => {
      return new Observable<ProjectInfo>(observer => {
        clusterObservers[projectKey] = observer;
      });
    });

    azureServiceSpy.refreshToken.and.returnValues(
      Promise.resolve({ accessToken: 't1' } as any),
      Promise.resolve({ accessToken: 't2' } as any)
    );

    service.setCurrentProject('project1');
    flushMicrotasks(); // resolves refreshToken #1 and subscribes to project1 clusters

    service.setCurrentProject('project2');
    flushMicrotasks(); // resolves refreshToken #2 and subscribes to project2 clusters

    // Emit the first project's cluster after the second call has superseded it.
    clusterObservers['project1'].next({ projectKey: 'project1', clusters: ['cluster1'] } as any);
    clusterObservers['project2'].next({ projectKey: 'project2', clusters: ['cluster2'] } as any);

    const storedRaw = localStorage.getItem('selectedProject');
    expect(storedRaw).toBeTruthy();

    const stored = JSON.parse(storedRaw!);
    expect(stored).toEqual({ projectKey: 'project2', location: 'cluster2' });
    expect(service.getCurrentProject()).toEqual({ projectKey: 'project2', location: 'cluster2' });

    const setItemValues = (localStorage.setItem as jasmine.Spy).calls.allArgs().map(args => args[1] as string);
    expect(setItemValues.some(v => v.includes('"projectKey":"project1"'))).toBeFalse();
    expect(setItemValues.some(v => v.includes('"projectKey":"project2"'))).toBeTrue();
  }));

  it('should ignore stale refreshToken resolution when setCurrentProject is called again (requestId guard before getProjectClusters)', fakeAsync(() => {
    spyOn(localStorage, 'setItem').and.callThrough();

    let resolveToken1: ((value: any) => void) | undefined;
    let resolveToken2: ((value: any) => void) | undefined;

    const tokenPromise1 = new Promise<any>(resolve => (resolveToken1 = resolve));
    const tokenPromise2 = new Promise<any>(resolve => (resolveToken2 = resolve));

    azureServiceSpy.refreshToken.and.returnValues(tokenPromise1 as any, tokenPromise2 as any);

    projectsServiceSpy.getProjectClusters = jasmine.createSpy().and.callFake((token: string, projectKey: string) => {
      return of({ projectKey, clusters: [`${projectKey}-cluster`] } as any);
    });

    service.setCurrentProject('project1');
    service.setCurrentProject('project2');

    // Resolve the second token first; it should win.
    resolveToken2!({ accessToken: 't2' });
    flushMicrotasks();

    expect(projectsServiceSpy.getProjectClusters).toHaveBeenCalledTimes(1);
    expect(projectsServiceSpy.getProjectClusters).toHaveBeenCalledWith('t2', 'project2');

    expect(service.getCurrentProject()).toEqual({ projectKey: 'project2', location: 'project2-cluster' });
    expect(JSON.parse(localStorage.getItem('selectedProject')!)).toEqual({
      projectKey: 'project2',
      location: 'project2-cluster'
    });

    // Now resolve the first token after it's stale; it should be ignored entirely (no backend call, no storage update).
    resolveToken1!({ accessToken: 't1' });
    flushMicrotasks();

    expect(projectsServiceSpy.getProjectClusters).toHaveBeenCalledTimes(1);
    expect(service.getCurrentProject()).toEqual({ projectKey: 'project2', location: 'project2-cluster' });

    const setItemValues = (localStorage.setItem as jasmine.Spy).calls.allArgs().map(args => args[1] as string);
    expect(setItemValues.some(v => v.includes('"projectKey":"project1"'))).toBeFalse();
    expect(setItemValues.some(v => v.includes('"projectKey":"project2"'))).toBeTrue();
  }));

  it('should get project components with mapped data', fakeAsync(() => {
    const mockComponents = [
      {
        componentId: 'comp1',
        status: 'Active',
        logoUrl: 'http://example.com/image.png',
        componentUrl: 'http://example.com/comp1',
        canBeDeleted: true
      },
      {
        componentId: 'comp2',
        status: 'Inactive',
        logoUrl: null,
        componentUrl: 'http://example.com/comp2',
        canBeDeleted: false
      }
    ];

    azureServiceSpy.refreshToken.and.returnValue(Promise.resolve({ accessToken: 'test-token' } as AuthenticationResult));
    projectComponentsServiceSpy.getProjectComponents = jasmine.createSpy().and.returnValue(of(mockComponents as any));

    let result: any;
    service.getProjectComponents('PROJECT_1').subscribe(components => {
      result = components;
    });

    flushMicrotasks();

    expect(azureServiceSpy.refreshToken).toHaveBeenCalled();
    expect(projectComponentsServiceSpy.getProjectComponents).toHaveBeenCalledWith('PROJECT_1', 'test-token');
    expect(result).toEqual([
      {
        name: 'comp1',
        status: 'Active',
        logo: 'http://example.com/image.png',
        url: 'http://example.com/comp1',
        canDelete: true
      },
      {
        name: 'comp2',
        status: 'Inactive',
        logo: null,
        url: 'http://example.com/comp2',
        canDelete: false
      }
    ]);
  }));

  it('should use default values when component properties are missing or undefined', fakeAsync(() => {
    const mockComponentsWithMissingData = [
      {
        componentId: undefined,
        status: null,
        logoUrl: undefined,
        componentUrl: '',
        canBeDeleted: undefined
      },
      {
        componentId: '',
        status: '',
        logoUrl: null,
        componentUrl: null,
        canBeDeleted: false
      },
      {
        // All properties missing
      }
    ];

    azureServiceSpy.refreshToken.and.returnValue(Promise.resolve({ accessToken: 'test-token' } as AuthenticationResult));
    projectComponentsServiceSpy.getProjectComponents = jasmine.createSpy().and.returnValue(of(mockComponentsWithMissingData as any));

    let result: any;
    service.getProjectComponents('PROJECT_1').subscribe(components => {
      result = components;
    });

    flushMicrotasks();

    expect(azureServiceSpy.refreshToken).toHaveBeenCalled();
    expect(projectComponentsServiceSpy.getProjectComponents).toHaveBeenCalledWith('PROJECT_1', 'test-token');
    expect(result).toEqual([
      {
        name: '',
        status: 'UNKNOWN',
        logo: null,
        url: '',
        canDelete: false
      },
      {
        name: '',
        status: 'UNKNOWN',
        logo: null,
        url: '',
        canDelete: false
      },
      {
        name: '',
        status: 'UNKNOWN',
        logo: null,
        url: '',
        canDelete: false
      }
    ]);
  }));

  it('should set logo to null when getProductImage fails', fakeAsync(() => {
    const mockComponents = [
      {
        componentId: 'comp1',
        status: 'Active',
        logoUrl: 'image-id-1',
        componentUrl: 'http://example.com/comp1',
        canBeDeleted: true
      },
      {
        componentId: 'comp2',
        status: 'Inactive',
        logoUrl: 'image-id-2',
        componentUrl: 'http://example.com/comp2',
        canBeDeleted: false
      }
    ];

    azureServiceSpy.refreshToken.and.returnValue(Promise.resolve({ accessToken: 'test-token' } as AuthenticationResult));
    projectComponentsServiceSpy.getProjectComponents = jasmine.createSpy().and.returnValue(of(mockComponents as any));
    catalogServiceSpy.getProductImage.and.returnValue(Promise.resolve(undefined));

    let result: any;
    service.getProjectComponents('PROJECT_1').subscribe(components => {
      result = components;
    });

    flushMicrotasks();

    expect(catalogServiceSpy.getProductImage).toHaveBeenCalledWith('image-id-1');
    expect(catalogServiceSpy.getProductImage).toHaveBeenCalledWith('image-id-2');
    expect(result).toEqual([
      {
        name: 'comp1',
        status: 'Active',
        logo: null,
        url: 'http://example.com/comp1',
        canDelete: true
      },
      {
        name: 'comp2',
        status: 'Inactive',
        logo: null,
        url: 'http://example.com/comp2',
        canDelete: false
      }
    ]);
  }));
});