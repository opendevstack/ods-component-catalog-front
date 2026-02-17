import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { RequestDeletionDialogComponent } from './request-deletion-dialog.component';

describe('RequestDeletionDialogComponent', () => {
  let component: RequestDeletionDialogComponent;
  let fixture: ComponentFixture<RequestDeletionDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<RequestDeletionDialogComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [RequestDeletionDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { componentName: 'test-component', projectKey: 'test-project', location: 'test-location' } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestDeletionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not accept if deploymentStatus is not set', () => {
    component.deploymentStatus = undefined;
    component.reason = 'Test reason';
    
    component.onAccept();
    
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should not accept if reason is empty', () => {
    component.deploymentStatus = false;
    component.reason = '   ';
    
    component.onAccept();
    
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should not accept if deployment status is deployed but changeNumber is empty', () => {
    component.deploymentStatus = true;
    component.reason = 'Test reason';
    component.changeNumber = '   ';
    
    component.onAccept();
    
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should not accept if deployment status is deployed but changeNumber format is invalid', () => {
    component.deploymentStatus = true;
    component.reason = 'Test reason';
    component.changeNumber = 'INVALID';
    
    component.onAccept();
    
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should accept with valid data for not-deployed status', () => {
    component.deploymentStatus = false;
    component.reason = 'Test reason';
    
    component.onAccept();
    
    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      deploymentStatus: false,
      changeNumber: '-',
      reason: 'Test reason',
      projectKey: 'test-project',
      componentName: 'test-component',
      location: 'test-location'
    });
  });

  it('should accept with valid data for deployed status with valid change number', () => {
    component.deploymentStatus = true;
    component.reason = 'Test reason';
    component.changeNumber = 'CHG1234567';
    
    component.onAccept();
    
    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      deploymentStatus: true,
      changeNumber: 'CHG1234567',
      reason: 'Test reason',
      projectKey: 'test-project',
      componentName: 'test-component',
      location: 'test-location'
    });
  });

  it('should close dialog without data on cancel', () => {
    component.onCancel();
    
    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });
});
