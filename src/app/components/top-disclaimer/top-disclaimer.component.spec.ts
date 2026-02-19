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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
