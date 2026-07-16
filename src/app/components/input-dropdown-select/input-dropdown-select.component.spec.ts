import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownSelectComponent } from './input-dropdown-select.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


describe('DropdownSingleSelectComponent', () => {
  let component: DropdownSelectComponent;
  let fixture: ComponentFixture<DropdownSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownSelectComponent, BrowserAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropdownSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Text');
    fixture.componentRef.setInput('options', ['Option 1', 'Option 2']);
    fixture.componentRef.setInput('placeholder', 'Text');
  
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
