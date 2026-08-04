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
export declare const getNextSequence: (name: string) => Promise<number>;
export declare const generateProductId: () => Promise<string>;
export declare const generateProductCode: (category: string) => Promise<string>;
export declare const generateQuoteCode: () => Promise<string>;
export declare const generateStockCode: () => Promise<string>;
//# sourceMappingURL=counter.model.d.ts.map