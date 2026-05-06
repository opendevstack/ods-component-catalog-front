import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { RequestDeletionSimpleDialogComponent } from './request-deletion-simple-dialog.component';
import { RequestDeletionDialogData } from '../../models/request-deletion-dialog-data';

describe('RequestDeletionSimpleDialogComponent', () => {
  let component: RequestDeletionSimpleDialogComponent;
  let fixture: ComponentFixture<RequestDeletionSimpleDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<RequestDeletionSimpleDialogComponent>>;

  const dialogData: RequestDeletionDialogData = {
    componentName: 'test-component',
    projectKey: 'test-project',
    location: 'test-location'
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [RequestDeletionSimpleDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestDeletionSimpleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog with data on accept', () => {
    component.onAccept();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(dialogData);
  });

  it('should close dialog without data on cancel', () => {
    component.onCancel();

    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });

  it('should call onCancel when close icon is clicked', () => {
    spyOn(component, 'onCancel');

    const closeIcon = fixture.debugElement.query(
      By.css('appshell-icon[icon="close"]')
    );
    closeIcon.triggerEventHandler('click', null);

    expect(component.onCancel).toHaveBeenCalled();
  });

  it('should call onCancel when Cancel button is clicked', () => {
    spyOn(component, 'onCancel');

    const cancelButton = fixture.debugElement
      .queryAll(By.css('button'))
      .find(btn => btn.nativeElement.textContent.trim() === 'Cancel');

    cancelButton!.nativeElement.click();

    expect(component.onCancel).toHaveBeenCalled();
  });

  it('should call onAccept when Request button is clicked', () => {
    spyOn(component, 'onAccept');

    const requestButton = fixture.debugElement
      .queryAll(By.css('button'))
      .find(btn => btn.nativeElement.textContent.trim() === 'Request');

    requestButton!.nativeElement.click();

    expect(component.onAccept).toHaveBeenCalled();
  });
});