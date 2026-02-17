import { ComponentStatus } from './component-status';

export interface ProjectComponent {
    name: string;
    status: ComponentStatus;
    logo: string | null;
    url: string;
    canDelete: boolean;
}