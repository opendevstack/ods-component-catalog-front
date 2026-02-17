# AppShell in Angular

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.1 using the AppShell library (v18.0.1) and Angular Material (v17.0.0).

The AppShell is a framework and foundation to boost the development of modern web applications on the EDP. The framework provides commonly used capabilities in frontend and backend application components.

With the AppShell, we are offering design templates "ready to use" so any platform can optimize the efforts  by using our adaptable templates, promoting consistency between platforms but also guaranteeing following the Digital Design System of our company and complying with Web Content Accessibility Guidelines. 

## Configuring the local environment

In order for a developer to work locally, the file `proxy.conf.json` needs to be updated to use the proper backend host in the `target` property.  
In addition, the `public/config/config.json` needs to be updated accordingly. Using a different azure application if needed and also selecting the catalogId.  
The catalogId is the result of encoding the relative route of the catalog definition within the bitbucket host that the backend uses. For example, the current value is for: /projects/DSMC/repos/catalog/browse/Catalog.yaml?at=refs/heads/master. If you need to encode a new value, you can run the following command and then paste the value in the config file: 
> echo /projects/DSMC/repos/catalog/browse/Catalog.yaml?at=refs/heads/master | base64 -w 0

If you have the config.json and the proxy.conf.json files properly configured, the application should work without updating anything else.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Generate the API client

In order to generate a new client, you can update the contents of the `openapi.yaml` file in the root directory with the latest version of the contract and then execute the script `npm run generate-api-client`

## How to use the AppShell library

For detailed instructions on how to use the AppShell library, including available components, their inputs, outputs, and expected parameters, please refer to our comprehensive guide on Confluence.

[Access the Library Guide](https://confluence.biscrum.com/x/T9rTGw)

# Quality
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=opendevstack_ods-component-catalog-front&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=opendevstack_ods-component-catalog-front)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=opendevstack_ods-component-catalog-front&metric=coverage)](https://sonarcloud.io/summary/new_code?id=opendevstack_ods-component-catalog-front)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=opendevstack_ods-component-catalog-front&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=opendevstack_ods-component-catalog-front)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=opendevstack_ods-component-catalog-front&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=opendevstack_ods-component-catalog-front)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=opendevstack_ods-component-catalog-front&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=opendevstack_ods-component-catalog-front)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=opendevstack_ods-component-catalog-front&metric=bugs)](https://sonarcloud.io/summary/new_code?id=opendevstack_ods-component-catalog-front)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=opendevstack_ods-component-catalog-front&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=opendevstack_ods-component-catalog-front)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=opendevstack_ods-component-catalog-front&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=opendevstack_ods-component-catalog-front)