import { ProductActionParameterLocation } from "./product-action-parameter-location";
import { ProductActionParameterValidation } from "./product-action-parameter-validation";

export interface ProductActionParameter {
    name: string;
    type: string;
    required: boolean;
    defaultValue?: string | null;
    defaultValues?: string[] | null;
    options?: string[] | null;
    locations?: Array<ProductActionParameterLocation>;
    label: string;
    placeholder?: string | null;
    hint?: string | null;
    visible: boolean;
    validations?: Array<ProductActionParameterValidation>;
    disabled?: boolean;
}