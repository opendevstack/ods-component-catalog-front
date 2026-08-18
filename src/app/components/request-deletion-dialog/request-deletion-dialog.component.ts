import { CommonModule } from "@angular/common";
import { Component, Inject, ViewEncapsulation } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatRadioModule } from "@angular/material/radio";
import { RequestDeletionDialogData } from "../../models/request-deletion-dialog-data";
import { AppShellIconComponent } from "@opendevstack/ngx-appshell";

@Component({
  selector: 'app-request-deletion-dialog',
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    FormsModule,
    AppShellIconComponent,
    MatDialogContent,
    MatDialogActions
],
  templateUrl: './request-deletion-dialog.component.html',
  styleUrl: './request-deletion-dialog.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class RequestDeletionDialogComponent {

  componentNameConfirmation = '';

  constructor(
    public dialogRef: MatDialogRef<RequestDeletionDialogComponent>, 
    @Inject(MAT_DIALOG_DATA) public data: RequestDeletionDialogData
  ) {}

  onAccept(): void {
    if (this.componentNameConfirmation !== this.data.componentName) {
      return;
    }
    this.dialogRef.close(this.data);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}