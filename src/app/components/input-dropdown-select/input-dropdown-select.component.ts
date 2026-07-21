import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
    selector: 'dropdown-select',
    imports: [MatSelectModule],
    templateUrl: './input-dropdown-select.component.html',
    styleUrl: './input-dropdown-select.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class DropdownSelectComponent {
  label = input.required<string>();
  options = input.required<string[]>();
  placeholder = input.required<string>();
  multipleSelection = input.required<boolean>();

  value = input<string | string[]>();
  valueChange = output<string | string[]>();
}
