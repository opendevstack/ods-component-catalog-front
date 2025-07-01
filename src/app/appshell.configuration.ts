import { Injectable } from "@angular/core";

const linkIcon = 'bi-chain-linked-icon';

@Injectable()
export class AppShellConfiguration {
    public static readonly headerVariant = ''; // theme-white | theme-purple | theme-blue
    public static readonly applicationSymbol = 'symbol-accent-green.svg';
    public static readonly applicationName = 'Marketplace 2.0';
    public static readonly appShellHelpLink = {
        anchor: '',
        icon: ''
    };
    public static readonly headerLinks = [];
}
