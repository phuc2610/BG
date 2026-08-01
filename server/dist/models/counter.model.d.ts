import mongoose, { Document } from 'mongoose';
export interface ICounterDocument extends Document {
    name: string;
    seq: number;
}
export declare const Counter: mongoose.Model<ICounterDocument, {}, {}, {}, mongoose.Document<unknown, {}, ICounterDocument, {}, {}> & ICounterDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const getNextSequence: (name: string, ownerId?: string) => Promise<number>;
export declare const generateProductId: (ownerId?: string) => Promise<string>;
export declare const generateProductCode: (category: string, ownerId?: string) => Promise<string>;
export declare const generateQuoteCode: (ownerId?: string) => Promise<string>;
export declare const generateStockCode: (ownerId?: string) => Promise<string>;
//# sourceMappingURL=counter.model.d.ts.map