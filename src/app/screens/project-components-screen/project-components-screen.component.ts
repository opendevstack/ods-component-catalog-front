import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AppShellIconComponent, AppShellLink, AppShellNotification, AppShellPageHeaderComponent, AppShellToastService } from '@opendevstack/ngx-appshell';
import { ProjectService } from '../../services/project.service';
import { Subject, map, switchMap, takeUntil } from 'rxjs';
import { AppProject } from '../../models/project';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectComponent } from '../../models/project-component';
import { ComponentCardComponent } from '../../components/component-card/component-card.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RequestDeletionDialogComponent } from '../../components/request-deletion-dialog/request-deletion-dialog.component';
import { RequestDeletionDialogResult } from '../../models/request-deletion-dialog-data';
import { ProvisionerService } from '../../services/provisioner.service';
import { AzureService } from '../../services/azure.service';
import { AppUser } from '../../models/app-user';
import { CreateIncidentParameter } from '../../openapi/component-provisioner';

@Component({
  selector: 'app-project-components-screen',
  imports: [AppShellPageHeaderComponent, AppShellIconComponent, ComponentCardComponent, MatDialogModule],
  templateUrl: './project-components-screen.component.html',
  styleUrl: './project-components-screen.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ProjectComponentsScreenComponent implements OnInit, OnDestroy {

  selectedProject: AppProject | null = null;
  breadcrumbLinks: AppShellLink[] = [];
  pageTitle = 'My Components';

  projectComponents: ProjectComponent[] = [];
  isLoading = false;
  
  connectionErrorHtmlMessage: string | undefined;
  connectionErrorIcon: string | undefined;

  loggedUser: AppUser | null = null;

  private readonly _destroying$ = new Subject<void>();

  constructor(
    private readonly projectService: ProjectService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly provisionerService: ProvisionerService,
    private readonly azureService: AzureService,
    private readonly toastService: AppShellToastService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.projectService.project$
      .pipe(takeUntil(this._destroying$))
      .subscribe((project: AppProject | null) => {
        if (this.selectedProject?.projectKey !== project?.projectKey) {
          this.projectComponents = [];
          this.router.navigateByUrl(`/${project?.projectKey}/components`, { replaceUrl: true });
        }
        this.selectedProject = project;
        if (project != null) {
          this.updateBreadcrumbs(project);
          this.isLoading = true;
          this.projectService.getProjectComponents(project.projectKey).subscribe({
            next: (components) => {
              this.projectComponents = components;
              this.isLoading = false;
              this.unsetConnectionErrorState();
            },
            error: () => {
              this.setConnectionErrorState();
              this.isLoading = false;
            }
          });
        }
      });

    this.route.params
      .pipe(
        takeUntil(this._destroying$),
        map(params => params['projectKey'] || ''),
        switchMap((projectKey: string) =>
          this.projectService.ensureUserProjectsLoaded().pipe(
            map((projects) => ({ projectKey, projects }))
          )
        )
      )
      .subscribe(({ projectKey, projects }) => {
        if (!projectKey) {
          this.router.navigateByUrl('/page-not-found', { replaceUrl: true });
          return;
        }
        if (!projects.includes(projectKey)) {
          this.router.navigateByUrl('/page-not-found', { replaceUrl: true });
          return;
        }

        const currentProject = this.projectService.getCurrentProject();
        if (currentProject?.projectKey !== projectKey) {
          this.projectService.setCurrentProject(projectKey);
        }
      });

    this.azureService.loggedUser$.pipe(takeUntil(this._destroying$)).subscribe(user => {
      this.loggedUser = user;
    });
  }

  updateBreadcrumbs(project: AppProject): void {
    this.breadcrumbLinks = [
      {
        anchor: '',
        label: `Project ${project.projectKey}`,
      },
      {
        anchor: '',
        label: 'My Components',
      }
    ];
  }

  onRequestDeletionClicked(component: ProjectComponent): void {
    if (!this.selectedProject) {
      return;
    }

    const dialogRef = this.dialog.open(RequestDeletionDialogComponent, {
      autoFocus: false,
      data: {
        componentName: component.name,
        projectKey: this.selectedProject.projectKey,
        location: this.selectedProject.location
      }
    });

    dialogRef.afterClosed().subscribe((result: RequestDeletionDialogResult | undefined) => {
      if (result) {
        this.submitDeletionRequest(result);
      }
    });
  }

  private submitDeletionRequest(result: RequestDeletionDialogResult): void {
    this.azureService.getRefreshedAccessToken().subscribe({
      next: (accessToken) => {
        /* eslint-disable @typescript-eslint/no-wrapper-object-types */
        const incidentParams: CreateIncidentParameter[] = [
          {
            name: 'cluster_location',
            type: 'string',
            value: result.location as String // NOSONAR
          },
          {
            name: 'caller',
            type: 'string',
            value: this.loggedUser?.username as String || 'unknown' // NOSONAR
          },
          {
            name: 'is_deployed',
            type: 'boolean',
            value: result.deploymentStatus as Boolean // NOSONAR

          },
          {
            name: 'change_number',
            type: 'string',
            value: result.changeNumber as String // NOSONAR
          },
          {
            name: 'reason',
            type: 'string',
            value: result.reason as String // NOSONAR
          },
          {
            name: 'access_token',
            type: 'string',
            value: accessToken as String // NOSONAR
          },
        ];
        /* eslint-enable @typescript-eslint/no-wrapper-object-types */
        this.provisionerService.requestComponentDeletion(
          result.projectKey,
          result.componentName,
          incidentParams
        ).subscribe({
          next: () => this.onDeletionRequestSuccess(result.componentName),
          error: (error) => this.onDeletionRequestError(error)
        });
      }
    });
  }

  private onDeletionRequestSuccess(componentName: string): void {
    // Apply optimistic UI and set the current component to deleting status
    const componentIndex = this.projectComponents.findIndex(c => c.name === componentName);
    if (componentIndex !== -1) {
      this.projectComponents[componentIndex].status = 'DELETING';
    }
    this.toastService.showToast({
      id: '',
      read: false,
      subject: 'only_toast',
      title: 'The request has successfully been sent. Support will receive a Service Now ticket and manage the component deletion.'
    } as AppShellNotification, 8000);
  }

  private onDeletionRequestError(error: unknown): void {
    console.error('Error executing action:', error);
    this.toastService.showToast({
      id: '',
      read: false,
      subject: 'only_toast',
      title: 'Something went wrong. Please try again later.'
    } as AppShellNotification, 8000);
  }

  private setConnectionErrorState() {
    this.connectionErrorHtmlMessage = 'Sorry, we are having trouble loading the page.<br/>Please check back in a few minutes.';
    this.connectionErrorIcon = 'smiley_sad';
  }
  
  private unsetConnectionErrorState() {
    this.connectionErrorHtmlMessage = undefined;
    this.connectionErrorIcon = undefined;
  }
  
  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }

}
