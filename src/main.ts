import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { defineCustomElements } from '@opendevstack/ods-selector-widget/loader';
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

defineCustomElements(window);

const isAuthCallback = new URLSearchParams(window.location.search).has('state') ||
  new URLSearchParams(window.location.hash.slice(1)).has('state');

if (isAuthCallback) {
  broadcastResponseToMainFrame().catch((err) => console.error('Error processing authentication callback', err));
} else {
  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
}
