import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopDisclaimerComponent } from './top-disclaimer.component';

describe('TopDisclaimerComponent', () => {
  let component: TopDisclaimerComponent;
  let fixture: ComponentFixture<TopDisclaimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopDisclaimerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopDisclaimerComponent);
    component = fixture.componentInstance;
    
    fixture.componentRef.setInput('disclaimerTextHtml', 'Fake disclaimer text');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit true when closeDisclaimer is called', () => {
    spyOn(component.disclaimerClosed, 'emit');
    component.closeDisclaimer();
    expect(component.disclaimerClosed.emit).toHaveBeenCalledWith(true);
  });
});
