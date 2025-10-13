import { Injectable } from "@angular/core";

@Injectable()
export class AppShellConfiguration {
    public static readonly headerVariant = ''; // theme-white | theme-purple | theme-blue
    public static readonly applicationSymbol = 'symbol-accent-green.svg';
    public static readonly applicationName = 'Marketplace 2.0';
    public static readonly appShellHelpLink = {
        anchor: '',
        icon: ''
    };
    public static readonly appShellNotificationsLink = {
        anchor: '/notifications',
        icon: 'bi-bell-icon'
    };
    public static readonly headerLinks = []
    public static readonly toastLimitInScreen = 3;
}
