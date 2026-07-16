import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownSelectComponent } from './input-dropdown-select.component';

describe('DropdownSelectComponent', () => {
  let component: DropdownSelectComponent;
  let fixture: ComponentFixture<DropdownSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownSelectComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DropdownSelectComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('label', 'Status');
    fixture.componentRef.setInput('options', ['A', 'B', 'C']);
    fixture.componentRef.setInput('placeholder', 'Select status');
    fixture.componentRef.setInput('multipleSelection', false);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should receive required inputs', () => {
    expect(component.label()).toBe('Status');
    expect(component.options()).toEqual(['A', 'B', 'C']);
    expect(component.placeholder()).toBe('Select status');
    expect(component.multipleSelection()).toBeFalse();
  });

  it('should receive value input', () => {
    fixture.componentRef.setInput('value', 'A');
    fixture.detectChanges();

    expect(component.value()).toBe('A');
  });

  it('should receive array value input', () => {
    fixture.componentRef.setInput('value', ['A', 'B']);
    fixture.detectChanges();

    expect(component.value()).toEqual(['A', 'B']);
  });

  it('should emit value change', () => {
    const emitSpy = spyOn(component.valueChange, 'emit');

    component.valueChange.emit('A');

    expect(emitSpy).toHaveBeenCalledWith('A');
  });

  it('should emit array value change', () => {
    const emitSpy = spyOn(component.valueChange, 'emit');

    component.valueChange.emit(['A', 'B']);

    expect(emitSpy).toHaveBeenCalledWith(['A', 'B']);
  });
});