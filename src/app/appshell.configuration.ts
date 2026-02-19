import { Injectable } from "@angular/core";

@Injectable()
export class AppShellConfiguration {
    public static readonly headerVariant = ''; // theme-white | theme-purple | theme-blue
    public static readonly applicationLogo = 'logo-accent-green.svg';
    public static readonly applicationName = 'MARKETPLACE';
    public static readonly appShellHelpLink = {
        anchor: 'https://github.com/opendevstack/ods-component-catalog-front',
        icon: 'headset_mic',
        label: 'Help',
    }
    public static readonly appShellNotificationsLink = {
        anchor: '/notifications',
        icon: 'bell',
        label: 'Notifications'
    };
    public static readonly headerLinks = []
    public static readonly createProjectUrl = 'https://github.com/opendevstack/ods-component-catalog-front';
    public static readonly requestProjectAccessUrl = 'https://github.com/opendevstack/ods-component-catalog-front';
    public static readonly requestCatalogProjectAccessUrl = 'https://github.com/opendevstack/ods-component-catalog-front';
    public static readonly topDisclaimerTextHtml = 'If this value is set, a disclaimer will be shown at the top of the page. It can be used to inform users about important information, such as maintenance windows or known issues.';
    public static readonly toastLimitInScreen = 3;
}
