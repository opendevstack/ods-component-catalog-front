import { AppShellProduct } from "@appshell/ngx-appshell";
import { ProductAction } from "./product-action";

export interface AppProduct extends AppShellProduct {
    actions?: Array<ProductAction>;
}