import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { RequestDeletionDialogComponent } from './request-deletion-dialog.component';
import { RequestDeletionDialogData } from '../../models/request-deletion-dialog-data';

describe('RequestDeletionDialogComponent', () => {
  let component: RequestDeletionDialogComponent;
  let fixture: ComponentFixture<RequestDeletionDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<RequestDeletionDialogComponent>>;

  const dialogData: RequestDeletionDialogData = {
    componentName: 'test-component',
    projectKey: 'test-project',
    location: 'test-location'
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [RequestDeletionDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestDeletionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog with data on accept', () => {
    component.componentNameConfirmation = dialogData.componentName;
    component.onAccept();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(dialogData);
  });

  it('should not close dialog when the component name does not match', () => {
    component.componentNameConfirmation = 'other-component';

    component.onAccept();

    expect(dialogRefSpy.close).not.toHaveBeenCalled();
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

  it('should call onAccept when Confirm button is clicked with the component name', () => {
    spyOn(component, 'onAccept');
    component.componentNameConfirmation = dialogData.componentName;
    fixture.detectChanges();

    const requestButton = fixture.debugElement
      .queryAll(By.css('button'))
      .find(btn => btn.nativeElement.textContent.trim() === 'Confirm');

    requestButton!.nativeElement.click();

    expect(component.onAccept).toHaveBeenCalled();
  });
});