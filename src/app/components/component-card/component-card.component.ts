import { Component, computed, input, output, ViewEncapsulation } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppShellChipComponent } from '@opendevstack/ngx-appshell';
import { ComponentStatus } from '../../models/component-status';

@Component({
    selector: 'app-component-card',
    imports: [MatCardModule, MatButtonModule, MatChipsModule, AppShellChipComponent, MatTooltipModule],
    templateUrl: './component-card.component.html',
    styleUrl: './component-card.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class ComponentCardComponent {

  name= input.required<string>();
  image = input<string | undefined>();
  status = input.required<ComponentStatus>();
  loading = input<boolean>(false);

  statusClass = computed(() => this.status().toLowerCase());
  statusLabel = computed(() => {
    switch (this.status()) {
      case 'CREATING':
        return 'Provisioning in Progress';
      case 'CREATED':
        return 'Provisioned Successfully';
      case 'FAILED':
        return 'Provisioned Failed';
      case 'DELETING':
        return 'Deletion Requested';
      case 'UNKNOWN':
      default:
        return 'Unknown';
    }
  });

  url = input<string>();
  canDelete = input<boolean>();

  requestDeletionClicked = output<void>();

  deletingTooltip = 'This component has already a Deletion Request in progress. Please contact Support if there is any issue. ';
  provisioningTooltip = 'The provisioning has not yet been completed.';

  constructor() {}

  onRequestDeletionClick() {
    this.requestDeletionClicked.emit();
  }

  isProvisioning() {
    return this.status() === 'CREATING';
  }

  isDeleting() {
    return this.status() === 'DELETING';
  }

  onViewRepositoryClick() {
    if (this.url()) {
      window.open(this.url(), '_self');
    }
  }
}
