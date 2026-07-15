import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
    selector: 'dropdown-single-select',
    imports: [MatSelectModule],
    templateUrl: './input-dropdown-single-select.component.html',
    styleUrl: './input-dropdown-single-select.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class DropdownSingleSelectComponent {
  label = input.required<string>();
  options = input.required<string[]>();
  placeholder = input.required<string>();

  selectValueChange = output<string[]>();
}
