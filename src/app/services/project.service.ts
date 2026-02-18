import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize, from, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { ProjectsService } from '../openapi/projects-info-service';
import { AzureService } from './azure.service';
import { AppProject } from '../models/project';
import { ProjectComponentsService } from '../openapi/component-catalog';
import { ProjectComponent } from '../models/project-component';
import { ComponentStatus } from '../models/component-status';
import { CatalogService } from './catalog.service';
import { AuthenticationResult } from "@azure/msal-browser";

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly PROJECT_STORAGE_KEY = 'selectedProject';
  private readonly projectSubject = new BehaviorSubject<AppProject | null>(this.getStoredProject());

  private userProjects: string[] = [];
  private readonly userProjectsSubject = new BehaviorSubject<string[] | null>(null);
  private userProjectsRequest$: Observable<string[]> | null = null;
  private setProjectRequestId = 0;

  public readonly project$: Observable<AppProject | null> = this.projectSubject.asObservable();
  public readonly userProjects$: Observable<string[] | null> = this.userProjectsSubject.asObservable();

  constructor(
    private readonly projectsService: ProjectsService, 
    private readonly azureService: AzureService,
    private readonly projectComponentsService: ProjectComponentsService,
    private readonly catalogService: CatalogService
  ) {
    const storedProject = this.getStoredProject();
    if (storedProject) {
      this.projectSubject.next(storedProject);
    }
  }
  
  getUserProjects(userToken: string): Observable<string[]> {
    return this.projectsService.getProjects(userToken).pipe(
      tap(projects => {
        this.userProjects = projects;
        this.userProjectsSubject.next(projects);
      })
    );
  }

  getCachedUserProjects(): string[] {
    return this.userProjects;
  }

  ensureUserProjectsLoaded(): Observable<string[]> {
    const cached = this.userProjectsSubject.value;
    if (cached !== null) {
      return of(cached);
    }

    if (this.userProjectsRequest$) {
      return this.userProjectsRequest$;
    }

    this.userProjectsRequest$ = from(this.azureService.refreshToken()).pipe(
      switchMap((azureData: AuthenticationResult) => this.getUserProjects(azureData.accessToken)),
      finalize(() => {
        this.userProjectsRequest$ = null;
      }),
      shareReplay(1)
    );

    return this.userProjectsRequest$;
  }

  getProjectCluster(project: string, userToken: string): Observable<string> {
    return this.projectsService.getProjectClusters(userToken, project).pipe(
      map(projectInfo => projectInfo.clusters.length > 0 ? projectInfo.clusters[0] : '')
    );
  }

  getCurrentProject(): AppProject | null {
    return this.projectSubject.value;
  }

  setCurrentProject(projectKey: string | null): void {
    const requestId = ++this.setProjectRequestId;
    if (projectKey) {
      this.azureService.refreshToken().then((azureData: AuthenticationResult) => {
        if (requestId !== this.setProjectRequestId) {
          return;
        }
        this.getProjectCluster(projectKey, azureData.accessToken).subscribe(cluster => {
          if (requestId !== this.setProjectRequestId) {
            return;
          }
          const project: AppProject = { projectKey: projectKey, location: cluster };
          localStorage.setItem(this.PROJECT_STORAGE_KEY, JSON.stringify(project));
          this.projectSubject.next(project);
        });
      });
    } else {
      localStorage.removeItem(this.PROJECT_STORAGE_KEY);
      this.projectSubject.next(null);
    }
  }

  getProjectComponents(projectKey: string): Observable<ProjectComponent[]> {
    return from(this.azureService.refreshToken()).pipe(
      switchMap((azureData: AuthenticationResult) =>
        this.projectComponentsService.getProjectComponents(projectKey, azureData.accessToken).pipe(
          switchMap(components =>
            from(Promise.all(components.map(async component => ({
              name: component.componentId || '',
              status: (component.status as ComponentStatus) || 'UNKNOWN',
              logo: component.logoUrl ? (await this.catalogService.getProductImage(component.logoUrl)) ?? null : null,
              url: component.componentUrl || '',
              canDelete: component.canBeDeleted || false
            }))))
          )
        )
      )
    );
  }

  private getStoredProject(): AppProject | null {
    try {
      const projectData = localStorage.getItem(this.PROJECT_STORAGE_KEY);
      return projectData ? JSON.parse(projectData) : null;
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
      return null;
    }
  }

}