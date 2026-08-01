import { z } from 'zod';
import { ProductCategory, ProductCondition } from '../types';
export declare const createProductSchema: z.ZodObject<{
    name: z.ZodString;
    category: z.ZodNativeEnum<typeof ProductCategory>;
    brand: z.ZodString;
    model: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    specs: z.ZodOptional<z.ZodObject<{
        cpu: z.ZodOptional<z.ZodString>;
        mainboard: z.ZodOptional<z.ZodString>;
        ram: z.ZodOptional<z.ZodString>;
        ssd: z.ZodOptional<z.ZodString>;
        hdd: z.ZodOptional<z.ZodString>;
        vga: z.ZodOptional<z.ZodString>;
        psu: z.ZodOptional<z.ZodString>;
        case: z.ZodOptional<z.ZodString>;
        cooler: z.ZodOptional<z.ZodString>;
        windows: z.ZodOptional<z.ZodString>;
        office: z.ZodOptional<z.ZodString>;
        accessories: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        cpu?: string | undefined;
        mainboard?: string | undefined;
        ram?: string | undefined;
        ssd?: string | undefined;
        hdd?: string | undefined;
        vga?: string | undefined;
        psu?: string | undefined;
        case?: string | undefined;
        cooler?: string | undefined;
        windows?: string | undefined;
        office?: string | undefined;
        accessories?: string | undefined;
        notes?: string | undefined;
    }, {
        cpu?: string | undefined;
        mainboard?: string | undefined;
        ram?: string | undefined;
        ssd?: string | undefined;
        hdd?: string | undefined;
        vga?: string | undefined;
        psu?: string | undefined;
        case?: string | undefined;
        cooler?: string | undefined;
        windows?: string | undefined;
        office?: string | undefined;
        accessories?: string | undefined;
        notes?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    category: ProductCategory;
    brand: string;
    model: string;
    name: string;
    description?: string | undefined;
    specs?: {
        cpu?: string | undefined;
        mainboard?: string | undefined;
        ram?: string | undefined;
        ssd?: string | undefined;
        hdd?: string | undefined;
        vga?: string | undefined;
        psu?: string | undefined;
        case?: string | undefined;
        cooler?: string | undefined;
        windows?: string | undefined;
        office?: string | undefined;
        accessories?: string | undefined;
        notes?: string | undefined;
    } | undefined;
}, {
    category: ProductCategory;
    brand: string;
    model: string;
    name: string;
    description?: string | undefined;
    specs?: {
        cpu?: string | undefined;
        mainboard?: string | undefined;
        ram?: string | undefined;
        ssd?: string | undefined;
        hdd?: string | undefined;
        vga?: string | undefined;
        psu?: string | undefined;
        case?: string | undefined;
        cooler?: string | undefined;
        windows?: string | undefined;
        office?: string | undefined;
        accessories?: string | undefined;
        notes?: string | undefined;
    } | undefined;
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
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    specs: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        cpu: z.ZodOptional<z.ZodString>;
        mainboard: z.ZodOptional<z.ZodString>;
        ram: z.ZodOptional<z.ZodString>;
        ssd: z.ZodOptional<z.ZodString>;
        hdd: z.ZodOptional<z.ZodString>;
        vga: z.ZodOptional<z.ZodString>;
        psu: z.ZodOptional<z.ZodString>;
        case: z.ZodOptional<z.ZodString>;
        cooler: z.ZodOptional<z.ZodString>;
        windows: z.ZodOptional<z.ZodString>;
        office: z.ZodOptional<z.ZodString>;
        accessories: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        cpu?: string | undefined;
        mainboard?: string | undefined;
        ram?: string | undefined;
        ssd?: string | undefined;
        hdd?: string | undefined;
        vga?: string | undefined;
        psu?: string | undefined;
        case?: string | undefined;
        cooler?: string | undefined;
        windows?: string | undefined;
        office?: string | undefined;
        accessories?: string | undefined;
        notes?: string | undefined;
    }, {
        cpu?: string | undefined;
        mainboard?: string | undefined;
        ram?: string | undefined;
        ssd?: string | undefined;
        hdd?: string | undefined;
        vga?: string | undefined;
        psu?: string | undefined;
        case?: string | undefined;
        cooler?: string | undefined;
        windows?: string | undefined;
        office?: string | undefined;
        accessories?: string | undefined;
        notes?: string | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    category?: ProductCategory | undefined;
    brand?: string | undefined;
    model?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    specs?: {
        cpu?: string | undefined;
        mainboard?: string | undefined;
        ram?: string | undefined;
        ssd?: string | undefined;
        hdd?: string | undefined;
        vga?: string | undefined;
        psu?: string | undefined;
        case?: string | undefined;
        cooler?: string | undefined;
        windows?: string | undefined;
        office?: string | undefined;
        accessories?: string | undefined;
        notes?: string | undefined;
    } | undefined;
}, {
    category?: ProductCategory | undefined;
    brand?: string | undefined;
    model?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    specs?: {
        cpu?: string | undefined;
        mainboard?: string | undefined;
        ram?: string | undefined;
        ssd?: string | undefined;
        hdd?: string | undefined;
        vga?: string | undefined;
        psu?: string | undefined;
        case?: string | undefined;
        cooler?: string | undefined;
        windows?: string | undefined;
        office?: string | undefined;
        accessories?: string | undefined;
        notes?: string | undefined;
    } | undefined;
}>;
//# sourceMappingURL=validators.d.ts.map