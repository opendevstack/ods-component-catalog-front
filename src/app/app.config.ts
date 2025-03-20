import { AppConfigService } from './services/app-config.service';
import { msalProviders } from './azure.config';
import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideMarkdown } from 'ngx-markdown';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Configuration, Param } from './openapi';
import { AzureService } from './services/azure.service';
import { tokenInterceptor } from './token.interceptor';

const apiBasePath = '/component-catalog';

export const appConfig: ApplicationConfig = {
  providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([tokenInterceptor]), withFetch()),
    provideMarkdown(),
	  {
      provide: APP_INITIALIZER,
      useFactory: initConfig,
      deps: [AppConfigService],
      multi: true,
    },
    ...msalProviders,
    {
      provide: Configuration,
      useValue: new Configuration({
        basePath: apiBasePath,
        encodeParam: (param: Param) => param.value as string, 
      }),
      deps: [AzureService],
      multi: false
    }
],
};

export function initConfig(appConfig: AppConfigService) {
  return () => appConfig.loadConfig();
}