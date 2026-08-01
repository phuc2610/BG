import mongoose, { Schema, Document } from 'mongoose';
import { ISettings } from '../types';
export interface ISettingsDocument extends ISettings, Document {
    ownerId?: Schema.Types.ObjectId;
}
export declare const Settings: mongoose.Model<ISettingsDocument, {}, {}, {}, mongoose.Document<unknown, {}, ISettingsDocument, {}, {}> & ISettingsDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
/**
 * Get or create default settings per owner
 */
export declare const getSettings: (ownerId?: any) => Promise<ISettingsDocument>;
//# sourceMappingURL=settings.model.d.ts.map