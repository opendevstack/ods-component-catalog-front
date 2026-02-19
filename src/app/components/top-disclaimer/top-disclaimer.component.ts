import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { AppShellIconComponent } from '@opendevstack/ngx-appshell';

@Component({
  selector: 'app-top-disclaimer',
  imports: [AppShellIconComponent],
  templateUrl: './top-disclaimer.component.html',
  styleUrl: './top-disclaimer.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class TopDisclaimerComponent {
  disclaimerTextHtml = input.required<string>();
  disclaimerClosed = output<boolean>();

  closeDisclaimer() {
    this.disclaimerClosed.emit(true);
  }
}
