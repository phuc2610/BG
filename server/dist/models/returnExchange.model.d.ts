import mongoose, { Document } from 'mongoose';
import { ReturnExchangeType, IReturnExchangeTransaction } from '../types';
export interface IReturnExchangeDocument extends Document, Omit<IReturnExchangeTransaction, '_id'> {
    createdAt: Date;
    updatedAt: Date;
}
export declare const ReturnExchangeTransaction: mongoose.Model<IReturnExchangeDocument, {}, {}, {}, mongoose.Document<unknown, {}, IReturnExchangeDocument, {}, {}> & IReturnExchangeDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
/**
 * Generates transaction code formatted: TRA202608060001 or DOI202608060001
 */
export declare function generateReturnExchangeCode(type: ReturnExchangeType): Promise<string>;
//# sourceMappingURL=returnExchange.model.d.ts.map