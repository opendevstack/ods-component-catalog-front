import { ProductActionParameter } from "./product-action-parameter";


export interface ProductAction {
    id: string;
    label: string;
    url: string | null;
    triggerMessage: string | null;
    parameters: Array<ProductActionParameter>;
    requestable: boolean;
    restrictionMessage: string;
}