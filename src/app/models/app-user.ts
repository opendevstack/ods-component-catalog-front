import { AppShellUser } from "@opendevstack/ngx-appshell";

export interface AppUser extends AppShellUser {
    projects: string[];
}