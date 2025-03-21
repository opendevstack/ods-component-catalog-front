import { Injectable } from "@angular/core";

const linkIcon = 'bi-chain-linked-icon';

@Injectable()
export class AppShellConfiguration {
    public static readonly headerVariant = ''; // theme-white | theme-purple | theme-blue
    public static readonly applicationSymbol = 'symbol-accent-green.svg';
    public static readonly applicationName = 'Data Science Catalog';
    public static readonly appShellHelpLink = {
        anchor: '',
        icon: ''
    };
    public static readonly headerLinks = [];
    public static readonly sidenavSections = [
        {
            label: 'CATALOG',
            links: [
                {label: 'Our repositories', anchor: '/', icon: 'bi-house-icon'},
                {label: 'Community', anchor: '/community', icon: 'bi-people-icon'}
            ]
        }
    ];
    public static readonly sidenavLinks = {
        label: 'Links',
        links: [
            {label: 'CDS', anchor: 'https://boehringer.sharepoint.com/:u:/r/sites/z365centraldatasciences/SitePages/Home.aspx?csf=1&web=1&e=u5L2sh', icon: linkIcon, target: '_blank'},
            {label: 'CBDS', anchor: 'https://boehringer.sharepoint.com/:u:/r/sites/mybi_discres/SitePages/Global-Computational-Biology-%26-Digital-Sciences.aspx?csf=1&web=1&e=NUQ2Qx', icon: linkIcon, target: '_blank'},
            {label: 'Apollo', anchor: 'https://boehringer.sharepoint.com/:u:/r/sites/z365apollocontrolcenter/SitePages/Apollo--.aspx?csf=1&web=1&e=KG0hKR', icon: linkIcon, target: '_blank'},
            {label: 'DXA', anchor: 'https://boehringer.sharepoint.com/sites/datascienceacademy', icon: linkIcon, target: '_blank'}
        ]
    };
}
