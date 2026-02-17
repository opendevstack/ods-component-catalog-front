import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentCardComponent } from './component-card.component';

describe('ComponentCardComponent', () => {
  let component: ComponentCardComponent;
  let fixture: ComponentFixture<ComponentCardComponent>;

  const myMockWindow = <any> window;
  myMockWindow.requestAnimationFrame = (callback: FrameRequestCallback) => {callback(0); return 0};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentCardComponent],
      providers: [ {provide: Window, useValue: myMockWindow} ]
    })
    .compileComponents();

    spyOn(window, 'requestAnimationFrame').and.callFake(callback => { callback(0); return 0} );

    fixture = TestBed.createComponent(ComponentCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('name', 'Test Component');
    fixture.componentRef.setInput('status', 'Provisioned Successfully');
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
  });

  describe('Input properties', () => {
    it('should accept and set name input', () => {
      const testName = 'My Component';
      fixture.componentRef.setInput('name', testName);
      fixture.componentRef.setInput('status', 'Test Status');
      fixture.detectChanges();
      
      expect(component.name()).toBe(testName);
    });

    it('should accept and set status input', () => {
      fixture.componentRef.setInput('name', 'Test');
      const testStatus = 'Provisioning in Progress';
      fixture.componentRef.setInput('status', testStatus);
      fixture.detectChanges();
      
      expect(component.status()).toBe(testStatus);
    });

    it('should accept and set image input', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Test');
      const testImage = 'http://example.com/image.png';
      fixture.componentRef.setInput('image', testImage);
      fixture.detectChanges();
      
      expect(component.image()).toBe(testImage);
    });

    it('should handle undefined image input', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Test');
      fixture.componentRef.setInput('image', undefined);
      fixture.detectChanges();
      
      expect(component.image()).toBeUndefined();
    });

    it('should accept and set url input', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Test');
      const testUrl = 'http://github.com/repo';
      fixture.componentRef.setInput('url', testUrl);
      fixture.detectChanges();
      
      expect(component.url()).toBe(testUrl);
    });

    it('should accept and set canDelete input', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Test');
      fixture.componentRef.setInput('canDelete', true);
      fixture.detectChanges();
      
      expect(component.canDelete()).toBe(true);
    });

    it('should handle false canDelete input', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Test');
      fixture.componentRef.setInput('canDelete', false);
      fixture.detectChanges();
      
      expect(component.canDelete()).toBe(false);
    });
  });

  describe('statusClass computed signal', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('name', 'Test');
    });

    it('should convert status "CREATED" correctly', () => {
      fixture.componentRef.setInput('status', 'CREATED');
      fixture.detectChanges();
      
      expect(component.statusClass()).toBe('created');
    });

    it('should convert status "FAILED" correctly', () => {
      fixture.componentRef.setInput('status', 'FAILED');
      fixture.detectChanges();
      
      expect(component.statusClass()).toBe('failed');
    });

    it('should convert status "DELETING" correctly', () => {
      fixture.componentRef.setInput('status', 'DELETING');
      fixture.detectChanges();
      
      expect(component.statusClass()).toBe('deleting');
    });

    it('should convert status "UNKNOWN" correctly', () => {
      fixture.componentRef.setInput('status', 'UNKNOWN');
      fixture.detectChanges();
      
      expect(component.statusClass()).toBe('unknown');
    });
  });

  describe('onRequestDeletionClick', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('name', 'Test Component');
      fixture.componentRef.setInput('status', 'CREATED');
      fixture.detectChanges();
    });

    it('should emit requestDeletionClicked event', () => {
      let emitted = false;
      component.requestDeletionClicked.subscribe(() => {
        emitted = true;
      });
      
      component.onRequestDeletionClick();
      
      expect(emitted).toBe(true);
    });

    it('should emit requestDeletionClicked event when called multiple times', () => {
      let emitCount = 0;
      component.requestDeletionClicked.subscribe(() => {
        emitCount++;
      });
      
      component.onRequestDeletionClick();
      component.onRequestDeletionClick();
      
      expect(emitCount).toBe(2);
    });
  });

  describe('isProvisioning', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('name', 'Test');
    });

    it('should return true when status is "CREATING"', () => {
      fixture.componentRef.setInput('status', 'CREATING');
      fixture.detectChanges();
      
      expect(component.isProvisioning()).toBe(true);
    });

    it('should return false when status is "CREATED"', () => {
      fixture.componentRef.setInput('status', 'CREATED');
      fixture.detectChanges();
      
      expect(component.isProvisioning()).toBe(false);
    });

    it('should return false when status is "FAILED"', () => {
      fixture.componentRef.setInput('status', 'FAILED');
      fixture.detectChanges();
      
      expect(component.isProvisioning()).toBe(false);
    });

    it('should return false when status is "DELETING"', () => {
      fixture.componentRef.setInput('status', 'DELETING');
      fixture.detectChanges();
      
      expect(component.isProvisioning()).toBe(false);
    });
  });

  describe('isDeleting', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('name', 'Test');
    });

    it('should return true when status is "DELETING"', () => {
      fixture.componentRef.setInput('status', 'DELETING');
      fixture.detectChanges();
      
      expect(component.isDeleting()).toBe(true);
    });

    it('should return false when status is "CREATING"', () => {
      fixture.componentRef.setInput('status', 'CREATING');
      fixture.detectChanges();
      
      expect(component.isDeleting()).toBe(false);
    });

    it('should return false when status is "CREATED"', () => {
      fixture.componentRef.setInput('status', 'CREATED');
      fixture.detectChanges();
      
      expect(component.isDeleting()).toBe(false);
    });

    it('should return false when status is "FAILED"', () => {
      fixture.componentRef.setInput('status', 'FAILED');
      fixture.detectChanges();
      
      expect(component.isDeleting()).toBe(false);
    });
  });

  describe('onViewRepositoryClick', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'CREATED');
    });

    it('should open url in new tab when url is provided', () => {
      const testUrl = 'http://github.com/test-repo';
      fixture.componentRef.setInput('url', testUrl);
      fixture.detectChanges();
      const windowOpenSpy = spyOn(window, 'open');
      
      component.onViewRepositoryClick();
      
      expect(windowOpenSpy).toHaveBeenCalledWith(testUrl, '_self');
    });

    it('should not call window.open when url is undefined', () => {
      fixture.componentRef.setInput('url', undefined);
      fixture.detectChanges();
      const windowOpenSpy = spyOn(window, 'open');
      
      component.onViewRepositoryClick();
      
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it('should not call window.open when url is empty string', () => {
      fixture.componentRef.setInput('url', '');
      fixture.detectChanges();
      const windowOpenSpy = spyOn(window, 'open');
      
      component.onViewRepositoryClick();
      
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it('should open different url when different url is provided', () => {
      const testUrl = 'http://gitlab.com/another-repo';
      fixture.componentRef.setInput('url', testUrl);
      fixture.detectChanges();
      const windowOpenSpy = spyOn(window, 'open');
      
      component.onViewRepositoryClick();
      
      expect(windowOpenSpy).toHaveBeenCalledWith(testUrl, '_self');
    });
  });

  describe('Tooltip messages', () => {
    it('should have correct deletingTooltip message', () => {
      expect(component.deletingTooltip).toBe('This component has already a Deletion Request in progress. Please contact Support if there is any issue. ');
    });

    it('should have correct provisioningTooltip message', () => {
      expect(component.provisioningTooltip).toBe('The provisioning has not yet been completed.');
    });
  });

  describe('Component integration tests', () => {
    it('should render component name in the template', () => {
      fixture.componentRef.setInput('name', 'Integration Test Component');
      fixture.componentRef.setInput('status', 'CREATED');
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const titleElement = compiled.querySelector('mat-card-title');
      
      expect(titleElement.textContent).toContain('Integration Test Component');
    });

    it('should render status in the template', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'CREATED');
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const chipElement = compiled.querySelector('appshell-chip');
      
      expect(chipElement).toBeTruthy();
      expect(chipElement.getAttribute('ng-reflect-label')).toBe('Provisioned Successfully');
    });

    it('should apply correct status class to chip', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'CREATING');
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const chipElement = compiled.querySelector('appshell-chip');
      
      expect(chipElement.classList.contains('creating')).toBe(true);
    });

    it('should render image when provided', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Test');
      fixture.componentRef.setInput('image', 'http://example.com/logo.png');
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const imageElement = compiled.querySelector('img[mat-card-image]');
      
      expect(imageElement).toBeTruthy();
      expect(imageElement.getAttribute('src')).toBe('http://example.com/logo.png');
    });

    it('should not render image when not provided', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Test');
      fixture.componentRef.setInput('image', undefined);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const imageElement = compiled.querySelector('img[mat-card-image]');
      
      expect(imageElement).toBeFalsy();
    });

    it('should disable request deletion button when canDelete is false', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Provisioned Successfully');
      fixture.componentRef.setInput('canDelete', false);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const deleteButton = compiled.querySelector('.request-deletion-btn');
      
      expect(deleteButton.disabled).toBe(true);
    });

    it('should disable request deletion button when isDeleting returns true', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'DELETING');
      fixture.componentRef.setInput('canDelete', true);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const deleteButton = compiled.querySelector('.request-deletion-btn');
      
      expect(deleteButton.disabled).toBe(true);
    });

    it('should disable request deletion button when isProvisioning returns true', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'CREATING');
      fixture.componentRef.setInput('canDelete', true);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const deleteButton = compiled.querySelector('.request-deletion-btn');
      
      expect(deleteButton.disabled).toBe(true);
    });

    it('should enable request deletion button when canDelete is true and status allows', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'CREATED');
      fixture.componentRef.setInput('canDelete', true);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const deleteButton = compiled.querySelector('.request-deletion-btn');
      
      expect(deleteButton.disabled).toBe(false);
    });

    it('should call onRequestDeletionClick when request deletion button is clicked', () => {
      fixture.componentRef.setInput('name', 'Test Component');
      fixture.componentRef.setInput('status', 'Provisioned Successfully');
      fixture.componentRef.setInput('canDelete', true);
      fixture.detectChanges();
      
      spyOn(component, 'onRequestDeletionClick');
      
      const compiled = fixture.nativeElement;
      const deleteButton = compiled.querySelector('.request-deletion-btn');
      deleteButton.click();
      
      expect(component.onRequestDeletionClick).toHaveBeenCalled();
    });

    it('should call onViewRepositoryClick when view repository button is clicked', () => {
      fixture.componentRef.setInput('name', 'Test');
      fixture.componentRef.setInput('status', 'Provisioned Successfully');
      fixture.componentRef.setInput('url', 'http://example.com');
      fixture.detectChanges();
      
      spyOn(component, 'onViewRepositoryClick');
      
      const compiled = fixture.nativeElement;
      const viewButton = compiled.querySelector('.view-repository-btn');
      viewButton.click();
      
      expect(component.onViewRepositoryClick).toHaveBeenCalled();
    });
  });
});

