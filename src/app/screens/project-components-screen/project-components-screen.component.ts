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
        if (!currentProject || currentProject.projectKey !== projectKey) {
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
        this.azureService.getRefreshedAccessToken().subscribe({
          next: (accessToken) => {
            this.provisionerService.requestComponentDeletion(
              result.projectKey,
              result.componentName,
              this.loggedUser?.username || 'unknown',
              result.location,
              result.deploymentStatus,
              result.changeNumber,
              result.reason,
              accessToken
            ).subscribe({
              next: () => {
                // Apply optimistic UI and set the current component to deleting status
                const componentIndex = this.projectComponents.findIndex(c => c.name === result.componentName);
                if (componentIndex !== -1) {
                  this.projectComponents[componentIndex].status = 'DELETING';
                }
                this.toastService.showToast({
                  id: '',
                  read: false,
                  subject: 'only_toast',
                  title: 'The request has successfully been sent. Support will receive a Service Now ticket and manage the component deletion.'
                } as AppShellNotification, 8000);
              },
              error: (error) => {
                console.error('Error executing action:', error);
                this.toastService.showToast({
                  id: '',
                  read: false,
                  subject: 'only_toast',
                  title: 'Something went wrong. Please try again later.'
                } as AppShellNotification, 8000);
              }
            });
          }});
      }
    });
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
