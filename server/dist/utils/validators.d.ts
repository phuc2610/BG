import { z } from 'zod';
import { ProductCategory, ProductCondition } from '../types';
export declare const createProductSchema: z.ZodObject<{
    name: z.ZodString;
    category: z.ZodNativeEnum<typeof ProductCategory>;
    brand: z.ZodString;
    model: z.ZodString;
    description: z.ZodUnion<[z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<"">]>;
    imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<"">]>;
    imagePublicId: z.ZodUnion<[z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<"">]>;
    images: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    specs: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>>, Record<string, string>, Record<string, any> | null | undefined>;
}, "strip", z.ZodTypeAny, {
    category: ProductCategory;
    brand: string;
    model: string;
    name: string;
    specs: Record<string, string>;
    description?: string | null | undefined;
    images?: any[] | undefined;
    imageUrl?: string | null | undefined;
    imagePublicId?: string | null | undefined;
}, {
    category: ProductCategory;
    brand: string;
    model: string;
    name: string;
    description?: string | null | undefined;
    specs?: Record<string, any> | null | undefined;
    images?: any[] | undefined;
    imageUrl?: string | null | undefined;
    imagePublicId?: string | null | undefined;
}>;
export declare const createInventoryLotSchema: z.ZodObject<{
    product: z.ZodString;
    condition: z.ZodNativeEnum<typeof ProductCondition>;
    costPrice: z.ZodNumber;
    quantity: z.ZodNumber;
    serialNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    condition: ProductCondition;
    product: string;
    costPrice: number;
    quantity: number;
    serialNumber?: string | undefined;
}, {
    condition: ProductCondition;
    product: string;
    costPrice: number;
    quantity: number;
    serialNumber?: string | undefined;
}>;
export declare const updateProductSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodNativeEnum<typeof ProductCategory>>;
    brand: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<"">]>>;
    imageUrl: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<"">]>>;
    imagePublicId: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<"">]>>;
    images: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
    specs: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>>, Record<string, string>, Record<string, any> | null | undefined>>;
}, "strip", z.ZodTypeAny, {
    category?: ProductCategory | undefined;
    brand?: string | undefined;
    model?: string | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    specs?: Record<string, string> | undefined;
    images?: any[] | undefined;
    imageUrl?: string | null | undefined;
    imagePublicId?: string | null | undefined;
}, {
    category?: ProductCategory | undefined;
    brand?: string | undefined;
    model?: string | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    specs?: Record<string, any> | null | undefined;
    images?: any[] | undefined;
    imageUrl?: string | null | undefined;
    imagePublicId?: string | null | undefined;
}>;
//# sourceMappingURL=validators.d.ts.map