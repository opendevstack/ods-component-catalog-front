import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlatformSelectorWidgetDialogComponent } from './platform-selector-widget-dialog.component';

describe('PlatformSelectorWidgetDialogComponent', () => {
  let component: PlatformSelectorWidgetDialogComponent;
  let fixture: ComponentFixture<PlatformSelectorWidgetDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatButtonModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => { },
            componentInstance: () => { }
          }
        },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlatformSelectorWidgetDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});