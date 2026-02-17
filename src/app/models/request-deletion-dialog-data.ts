export interface RequestDeletionDialogData { 
    componentName: string;
    projectKey: string;
    location: string;
}

export interface RequestDeletionDialogResult {
    projectKey: string;
    componentName: string;
    deploymentStatus: boolean;
    changeNumber: string;
    reason: string;
    location: string;
}
