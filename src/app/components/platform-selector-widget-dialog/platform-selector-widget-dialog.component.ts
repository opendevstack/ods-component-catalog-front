import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlatformSelectorWidgetDialogData } from '../../models/platform-selector-widget-dialog-data';

@Component({
    selector: 'app-platform-selector-widget-dialog',
    templateUrl: './platform-selector-widget-dialog.component.html',
    styleUrl: './platform-selector-widget-dialog.component.scss',
    encapsulation: ViewEncapsulation.None,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PlatformSelectorWidgetDialogComponent {
  constructor(public dialogRef: MatDialogRef<PlatformSelectorWidgetDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: PlatformSelectorWidgetDialogData) {}
}