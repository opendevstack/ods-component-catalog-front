import { AppShellUser } from "@appshell/ngx-appshell";

export interface AppUser extends AppShellUser {
    projects: string[];
}