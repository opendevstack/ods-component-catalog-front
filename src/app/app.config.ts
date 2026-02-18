import { AppConfigService } from './services/app-config.service';
import { msalProviders } from './azure.config';
import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideMarkdown } from 'ngx-markdown';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Configuration as CatalogApiConfiguration, Param as CatalogApiParam } from './openapi/component-catalog';
import { Configuration as ProvisionerApiConfiguration, Param as ProvisionerApiParam } from './openapi/component-provisioner';
import { Configuration as ProjectsApiConfiguration, Param as ProjectsApiParam } from './openapi/projects-info-service';
import { AzureService } from './services/azure.service';
import { tokenInterceptor } from './token.interceptor';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { APPSHELL_ICON_SET_LITERAL, IconRegistryService } from '@opendevstack/ngx-appshell';
import { APPSHELL_ICON_SPRITE } from '../icons-sprite';

const catalogApiBasePath = '/component-catalog';
const projectsApiBasePath = '/projects-api';
const provisionerApiBasePath = '/component-provisioner';

export const appConfig: ApplicationConfig = {
  providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([tokenInterceptor]), withFetch()),
    provideMarkdown(),
    { provide: APPSHELL_ICON_SET_LITERAL, useValue: APPSHELL_ICON_SPRITE },
    provideAppInitializer(() => {
      const appConfigService = inject(AppConfigService);
      const iconService = inject(IconRegistryService);
      return appConfigService.loadConfig().then(() => 
        iconService.registerIconsFromManifest()
      );
    }),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        subscriptSizing: 'dynamic'
      }
    },
    ...msalProviders,
    {
      provide: CatalogApiConfiguration,
      useValue: new CatalogApiConfiguration({
        basePath: catalogApiBasePath,
        encodeParam: (param: CatalogApiParam) => param.value as string, 
      }),
      deps: [AzureService],
      multi: false
    },
    {
      provide: ProvisionerApiConfiguration,
      useValue: new ProvisionerApiConfiguration({
        basePath: provisionerApiBasePath,
        encodeParam: (param: ProvisionerApiParam) => param.value as string, 
      }),
      deps: [AzureService],
      multi: false
    },
    {
      provide: ProjectsApiConfiguration,
      useValue: new ProjectsApiConfiguration({
        basePath: projectsApiBasePath,
        encodeParam: (param: ProjectsApiParam) => param.value as string, 
      }),
      deps: [AzureService],
      multi: false
    }
  ],
};