import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownSingleSelectComponent } from './input-dropdown-single-select.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


describe('DropdownSingleSelectComponent', () => {
  let component: DropdownSingleSelectComponent;
  let fixture: ComponentFixture<DropdownSingleSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownSingleSelectComponent, BrowserAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropdownSingleSelectComponent);
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
