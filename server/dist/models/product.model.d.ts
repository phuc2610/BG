import mongoose, { Document } from 'mongoose';
import { ProductCategory, IProductImage, IProductSpecs } from '../types';
export interface IProductDocument extends Document {
    productId: string;
    productCode: string;
    barcode: string;
    name: string;
    category: ProductCategory;
    brand: string;
    modelName: string;
    description?: string;
    sellingPrice?: number;
    specs: IProductSpecs;
    images: IProductImage[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Product: mongoose.Model<IProductDocument, {}, {}, {}, mongoose.Document<unknown, {}, IProductDocument, {}, {}> & IProductDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=product.model.d.ts.map