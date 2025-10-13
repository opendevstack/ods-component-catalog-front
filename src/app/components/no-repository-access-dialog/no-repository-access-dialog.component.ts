import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { NoRepositoryAccessDialogData } from '../../models/no-repository-access-dialog-data';

@Component({
    selector: 'app-no-repository-access-dialog',
    imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
    templateUrl: './no-repository-access-dialog.component.html',
    styleUrl: './no-repository-access-dialog.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class NoRepositoryAccessDialogComponent {

  requestUrl: string = 'https://boehringer.service-now.com/esc?id=sc_cat_item&sys_id=3574dd671b75605099bd63546b4bcb1e';

  constructor(public dialogRef: MatDialogRef<NoRepositoryAccessDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: NoRepositoryAccessDialogData) {}
}