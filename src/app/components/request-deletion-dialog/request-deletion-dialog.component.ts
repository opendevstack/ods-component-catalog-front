import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { RequestDeletionDialogData, RequestDeletionDialogResult } from '../../models/request-deletion-dialog-data';
import { AppShellIconComponent } from '@opendevstack/ngx-appshell';

@Component({
  selector: 'app-request-deletion-dialog',
  imports: [
    CommonModule,
    MatButtonModule, 
    MatDialogActions,
    MatDialogContent, 
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    FormsModule,
    AppShellIconComponent
  ],
  templateUrl: './request-deletion-dialog.component.html',
  styleUrl: './request-deletion-dialog.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class RequestDeletionDialogComponent {

  deploymentStatus: boolean | undefined = undefined;
  changeNumber: string = '';
  reason: string = '';

  private readonly changeNumberPattern = /^CHG\d{7}$/;

  constructor(
    public dialogRef: MatDialogRef<RequestDeletionDialogComponent>, 
    @Inject(MAT_DIALOG_DATA) public data: RequestDeletionDialogData
  ) {}

  onAccept(): void {
    if (this.deploymentStatus === undefined) {
      return;
    }
    if (!this.reason.trim()) {
      return;
    }
    if (this.deploymentStatus) {
      if (!this.changeNumber.trim() || !this.changeNumberPattern.test(this.changeNumber)) {
        return;
      }
    }
    const result: RequestDeletionDialogResult = {
      deploymentStatus: this.deploymentStatus,
      changeNumber: this.deploymentStatus ? this.changeNumber : '-',
      reason: this.reason,
      projectKey: this.data.projectKey,
      componentName: this.data.componentName,
      location: this.data.location
    };
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
